// api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { sendNotification, createReleaseNotificationMessage } from "@/lib/notifications"

interface UploadedTrack {
  title: string
  trackNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  duration?: number
  lyrics?: string
}

interface UploadRequestBody {
  releaseTitle: string
  releaseDescription?: string
  releaseType: string
  tags?: string
  releaseDate?: string
  artworkUrl?: string
  tracks: UploadedTrack[]
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication  
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to upload music" },
        { status: 401 }
      )
    }

    // Get current user from database to get their ID and username
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, username: true }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const body: UploadRequestBody = await request.json()
    
    // Extract release data from JSON body (files are already uploaded)
    const {
      releaseTitle,
      releaseDescription,
      releaseType,
      tags,
      releaseDate,
      artworkUrl,
      tracks
    } = body

    if (!releaseTitle?.trim()) {
      return NextResponse.json(
        { error: "Release title is required" },
        { status: 400 }
      )
    }

    if (!tracks || tracks.length === 0) {
      return NextResponse.json(
        { error: "At least one track is required" },
        { status: 400 }
      )
    }

    const parsedReleaseDate = releaseDate ? new Date(releaseDate) : null

    // Create release in database
    const release = await db.release.create({
      data: {
        title: releaseTitle.trim(),
        description: releaseDescription?.trim() || null,
        releaseType,
        artworkUrl: artworkUrl || null,
        releaseDate: parsedReleaseDate,
        userId: currentUser.id,
        tracks: {
          create: tracks.map((track: UploadedTrack) => ({
            title: track.title.trim(),
            trackNumber: track.trackNumber,
            fileName: track.fileName,
            fileUrl: track.fileUrl,
            fileSize: track.fileSize,
            mimeType: track.mimeType,
            duration: track.duration || null,
            lyrics: track.lyrics?.trim() || null
          }))
        }
      }
    })

    // Handle tags if provided
    if (tags?.trim()) {
      const tagNames = tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      
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

    // Send notification about the new release (don't await - fire and forget)
    sendNotification({
      groupName: "release alerts",
      message: createReleaseNotificationMessage(releaseTitle.trim(), currentUser.username, release.id)
    }).catch(error => {
      console.error('Failed to send release notification:', error)
    })

    return NextResponse.json({
      message: "Release uploaded successfully!",
      releaseId: release.id,
      trackCount: tracks.length,
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
