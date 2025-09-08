import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { put, del } from "@vercel/blob"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// GET endpoint to fetch release data for viewing (no auth required)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const release = await db.release.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true
          }
        },
        tracks: {
          include: {
            _count: {
              select: {
                listens: true
              }
            }
          },
          orderBy: {
            trackNumber: 'asc'
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!release) {
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ release })
  } catch (error) {
    console.error("Error fetching release:", error)
    return NextResponse.json(
      { error: "Failed to fetch release" },
      { status: 500 }
    )
  }
}

// PUT endpoint to update release
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const { id } = await context.params
    const requestBody = await request.json()

    // Find existing release
    const existingRelease = await db.release.findUnique({
      where: { id },
      include: {
        tracks: true,
        tags: true
      }
    })

    if (!existingRelease) {
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (existingRelease.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own releases" },
        { status: 403 }
      )
    }

    // Extract JSON data
    const {
      releaseTitle,
      releaseDescription,
      releaseType,
      tags,
      releaseDate,
      artworkUrl,
      removeCurrentArtwork,
      existingTracks,
      newTracks
    } = requestBody

    const parsedReleaseDate = releaseDate ? new Date(releaseDate) : null


    if (!releaseTitle?.trim()) {
      return NextResponse.json(
        { error: "Release title is required" },
        { status: 400 }
      )
    }

    // Handle artwork updates
    let finalArtworkUrl = artworkUrl
    
    // Remove current artwork if requested
    if (removeCurrentArtwork && existingRelease.artworkUrl) {
      try {
        await del(existingRelease.artworkUrl)
        finalArtworkUrl = null
      } catch (error) {
        console.error("Failed to delete current artwork:", error)
      }
    }

    // If new artwork URL is provided and different from current, delete old one
    if (artworkUrl && artworkUrl !== existingRelease.artworkUrl && existingRelease.artworkUrl && !removeCurrentArtwork) {
      try {
        await del(existingRelease.artworkUrl)
      } catch (error) {
        console.error("Failed to delete old artwork:", error)
      }
    }

    // Handle existing tracks
    const tracksToDelete: string[] = []
    const tracksToUpdate: Array<{ id: string, title: string, trackNumber: number, lyrics: string }> = []

    existingTracks.forEach((track: any) => {
      if (track.toDelete) {
        tracksToDelete.push(track.id)
      } else {
        tracksToUpdate.push({
          id: track.id,
          title: track.title.trim(),
          trackNumber: track.trackNumber,
          lyrics: track.lyrics?.trim() || ''
        })
      }
    })

    // Delete marked tracks and their files
    for (const trackId of tracksToDelete) {
      const track = existingRelease.tracks.find(t => t.id === trackId)
      if (track) {
        try {
          await del(track.fileUrl)
        } catch (error) {
          console.error(`Failed to delete track file ${track.fileName}:`, error)
        }
        
        await db.track.delete({
          where: { id: trackId }
        })
      }
    }

    // Handle new tracks (they're already uploaded, just process the data)
    const newTracksData = newTracks.map((track: any) => ({
      title: track.title.trim(),
      trackNumber: track.trackNumber,
      fileName: track.fileName,
      fileUrl: track.fileUrl,
      fileSize: track.fileSize,
      mimeType: track.mimeType,
      lyrics: track.lyrics?.trim() || null,
      releaseId: id
    }))

    // Update release in database
    await db.release.update({
      where: { id },
      data: {
        title: releaseTitle.trim(),
        description: releaseDescription?.trim() || null,
        releaseType,
        releaseDate: parsedReleaseDate,
        artworkUrl: finalArtworkUrl
      }
    })

    // Update existing tracks
    for (const track of tracksToUpdate) {
      await db.track.update({
        where: { id: track.id },
        data: {
          title: track.title,
          trackNumber: track.trackNumber,
          lyrics: track.lyrics || null
        }
      })
    }

    // Create new tracks
    if (newTracksData.length > 0) {
      await db.track.createMany({
        data: newTracksData
      })
    }

    // Update tags
    // Delete existing release tags
    await db.releaseTag.deleteMany({
      where: { releaseId: id }
    })

    // Add new tags
    if (tags.trim()) {
      const tagNames = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      
      for (const tagName of tagNames) {
        const tag = await db.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {}
        })

        await db.releaseTag.create({
          data: {
            releaseId: id,
            tagId: tag.id
          }
        })
      }
    }

    // Get final track count
    const finalTrackCount = await db.track.count({
      where: { releaseId: id }
    })

    if (finalTrackCount === 0) {
      return NextResponse.json(
        { error: "Release must have at least one track" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: "Release updated successfully!",
      releaseId: id,
      trackCount: finalTrackCount,
      deletedTracks: tracksToDelete.length,
      addedTracks: newTracksData.length,
      hasArtwork: !!finalArtworkUrl
    })

  } catch (error) {
    console.error("Error updating release:", error)
    return NextResponse.json(
      { error: "Failed to update release" },
      { status: 500 }
    )
  }
}

// DELETE endpoint to delete release
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: releaseId } = await context.params
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Find the release and verify ownership
    const release = await db.release.findUnique({
      where: { id: releaseId },
      include: {
        tracks: true,
        tags: true
      }
    })

    if (!release) {
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      )
    }

    if (release.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own releases" },
        { status: 403 }
      )
    }

    // Delete all track files and artwork from Vercel Blob storage
    const fileDeletionPromises = []
    
    // Delete all track files
    release.tracks.forEach(track => {
      fileDeletionPromises.push(
        del(track.fileUrl).catch(blobError => {
          console.error(`Failed to delete track file ${track.fileName}:`, blobError)
        })
      )
    })
    
    // Delete artwork if it exists
    if (release.artworkUrl) {
      fileDeletionPromises.push(
        del(release.artworkUrl).catch(blobError => {
          console.error("Failed to delete artwork:", blobError)
        })
      )
    }

    // Wait for all file deletions to complete (or fail)
    await Promise.allSettled(fileDeletionPromises)

    // Delete release tags (cascade should handle this, but being explicit)
    await db.releaseTag.deleteMany({
      where: { releaseId: release.id }
    })

    // Delete all tracks (cascade should handle this, but being explicit)
    await db.track.deleteMany({
      where: { releaseId: release.id }
    })

    // Delete the release from database
    await db.release.delete({
      where: { id: releaseId }
    })

    return NextResponse.json({
      message: "Release deleted successfully",
      deletedTracks: release.tracks.length
    })
  } catch (error) {
    console.error("Error deleting release:", error)
    return NextResponse.json(
      { error: "Failed to delete release" },
      { status: 500 }
    )
  }
}
