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
    const formData = await request.formData()

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

    // Extract form data
    const releaseTitle = formData.get('releaseTitle') as string
    const releaseDescription = formData.get('releaseDescription') as string
    const releaseType = formData.get('releaseType') as string
    const tags = formData.get('tags') as string
    const removeCurrentArtwork = formData.get('removeCurrentArtwork') === 'true'
    const newArtworkFile = formData.get('artwork') as File | null
    const releaseDate = formData.get('releaseDate') as string
    const parsedReleaseDate = releaseDate ? new Date(releaseDate) : null


    if (!releaseTitle?.trim()) {
      return NextResponse.json(
        { error: "Release title is required" },
        { status: 400 }
      )
    }

    // Handle artwork updates
    let artworkUrl = existingRelease.artworkUrl
    
    // Remove current artwork if requested
    if (removeCurrentArtwork && existingRelease.artworkUrl) {
      try {
        await del(existingRelease.artworkUrl)
        artworkUrl = null
      } catch (error) {
        console.error("Failed to delete current artwork:", error)
      }
    }

    // Upload new artwork if provided
    if (newArtworkFile && newArtworkFile.size > 0) {
      try {
        // Delete old artwork first if exists
        if (existingRelease.artworkUrl && !removeCurrentArtwork) {
          await del(existingRelease.artworkUrl).catch(console.error)
        }
        
        const artworkBlob = await put(`artwork/${Date.now()}-${newArtworkFile.name}`, newArtworkFile, {
          access: 'public',
        })
        artworkUrl = artworkBlob.url
      } catch (error) {
        console.error("Failed to upload new artwork:", error)
        return NextResponse.json(
          { error: "Failed to upload new artwork" },
          { status: 500 }
        )
      }
    }

    // Handle existing tracks
    const existingTrackCount = parseInt(formData.get('existingTrackCount') as string || '0')
    const tracksToDelete: string[] = []
    const tracksToUpdate: Array<{ id: string, title: string, trackNumber: number, lyrics: string }> = []

    for (let i = 0; i < existingTrackCount; i++) {
      const trackId = formData.get(`existing_${i}_id`) as string
      const shouldDelete = formData.get(`existing_${i}_delete`) === 'true'
      
      if (shouldDelete) {
        tracksToDelete.push(trackId)
      } else {
        const title = formData.get(`existing_${i}_title`) as string
        const lyrics = formData.get(`existing_${i}_lyrics`) as string
        const trackNumber = parseInt(formData.get(`existing_${i}_number`) as string)
        tracksToUpdate.push({ id: trackId, title: title.trim(), lyrics: lyrics.trim(), trackNumber })
      }
    }

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

    // Handle new tracks
    const newTrackCount = parseInt(formData.get('newTrackCount') as string || '0')
    const newTracks = []

    for (let i = 0; i < newTrackCount; i++) {
      const trackFile = formData.get(`new_${i}_file`) as File
      const trackTitle = formData.get(`new_${i}_title`) as string
      const trackLyrics = formData.get(`new_${i}_lyrics`) as string
      const trackNumber = parseInt(formData.get(`new_${i}_number`) as string)

      if (!trackFile || !trackTitle) continue

      try {
        const blob = await put(`tracks/${Date.now()}-${trackFile.name}`, trackFile, {
          access: 'public',
        })

        newTracks.push({
          title: trackTitle.trim(),
          trackNumber,
          fileName: trackFile.name,
          fileUrl: blob.url,
          fileSize: trackFile.size,
          mimeType: trackFile.type,
          lyrics: trackLyrics?.trim() || null,
          releaseId: id
        })
      } catch (error) {
        console.error(`Failed to upload new track ${trackTitle}:`, error)
        return NextResponse.json(
          { error: `Failed to upload track: ${trackTitle}` },
          { status: 500 }
        )
      }
    }

    // Update release in database
    await db.release.update({
      where: { id },
      data: {
        title: releaseTitle.trim(),
        description: releaseDescription.trim() || null,
        releaseType,
        releaseDate: parsedReleaseDate,
        artworkUrl
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
    if (newTracks.length > 0) {
      await db.track.createMany({
        data: newTracks
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
      addedTracks: newTracks.length,
      hasArtwork: !!artworkUrl
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
