import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { put } from "@vercel/blob"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Check authentication  
    const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to upload music" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    
    // Extract release data
    const releaseTitle = formData.get('releaseTitle') as string
    const releaseDescription = formData.get('releaseDescription') as string
    const releaseType = formData.get('releaseType') as string
    const tags = formData.get('tags') as string
    const trackCount = parseInt(formData.get('trackCount') as string)
    const artworkFile = formData.get('artwork') as File | null
    const releaseDate = formData.get('releaseDate') as string
    const parsedReleaseDate = releaseDate ? new Date(releaseDate) : null

    if (!releaseTitle?.trim()) {
      return NextResponse.json(
        { error: "Release title is required" },
        { status: 400 }
      )
    }

    if (trackCount === 0) {
      return NextResponse.json(
        { error: "At least one track is required" },
        { status: 400 }
      )
    }

    // Upload artwork to blob storage if provided
    let artworkUrl: string | null = null
    if (artworkFile && artworkFile.size > 0) {
      try {
        const artworkBlob = await put(`artwork/${Date.now()}-${artworkFile.name}`, artworkFile, {
          access: 'public',
        })
        artworkUrl = artworkBlob.url
      } catch (error) {
        console.error("Failed to upload artwork:", error)
        return NextResponse.json(
          { error: "Failed to upload artwork" },
          { status: 500 }
        )
      }
    }

    // Upload all track files to blob storage
    const trackUploads = []
    for (let i = 0; i < trackCount; i++) {
      const trackFile = formData.get(`track_${i}_file`) as File
      const trackTitle = formData.get(`track_${i}_title`) as string
      const trackNumber = parseInt(formData.get(`track_${i}_number`) as string)

      if (!trackFile || !trackTitle) {
        return NextResponse.json(
          { error: `Track ${i + 1} is missing file or title` },
          { status: 400 }
        )
      }

      try {
        const blob = await put(`tracks/${Date.now()}-${trackFile.name}`, trackFile, {
          access: 'public',
        })

        trackUploads.push({
          title: trackTitle.trim(),
          trackNumber,
          fileName: trackFile.name,
          fileUrl: blob.url,
          fileSize: trackFile.size,
          mimeType: trackFile.type
        })
      } catch (error) {
        console.error(`Failed to upload track ${i + 1}:`, error)
        return NextResponse.json(
          { error: `Failed to upload track: ${trackTitle}` },
          { status: 500 }
        )
      }
    }

    // Create release in database
    const release = await db.release.create({
      data: {
        title: releaseTitle.trim(),
        description: releaseDescription.trim() || null,
        releaseType,
        artworkUrl,
        releaseDate: parsedReleaseDate,
        userId: session.user.id,
        tracks: {
          create: trackUploads
        }
      }
    })

    // Handle tags if provided
    if (tags.trim()) {
      const tagNames = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      
      for (const tagName of tagNames) {
        // Find or create the tag
        const tag = await db.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {}
        })

        // Create the release-tag relationship
        await db.releaseTag.create({
          data: {
            releaseId: release.id,
            tagId: tag.id
          }
        })
      }
    }

    return NextResponse.json({
      message: "Release uploaded successfully!",
      releaseId: release.id,
      trackCount: trackUploads.length,
      hasArtwork: !!artworkUrl
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload release" },
      { status: 500 }
    )
  }
}
