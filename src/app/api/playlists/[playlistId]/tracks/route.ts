import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// POST - Add track to playlist
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to add tracks to playlists" },
        { status: 401 }
      )
    }

    const { playlistId } = await context.params
    const { trackId } = await request.json()

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
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

    // Verify user owns the playlist
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id
      }
    })

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      )
    }

    // Verify track exists
    const track = await db.track.findUnique({
      where: { id: trackId }
    })

    if (!track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      )
    }

    // Check if track is already in playlist
    const existingPlaylistTrack = await db.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId: playlistId,
          trackId: trackId
        }
      }
    })

    if (existingPlaylistTrack) {
      return NextResponse.json(
        { error: "Track is already in this playlist" },
        { status: 400 }
      )
    }

    // Get the next position in the playlist
    const lastTrack = await db.playlistTrack.findFirst({
      where: { playlistId: playlistId },
      orderBy: { position: 'desc' }
    })

    const nextPosition = lastTrack ? lastTrack.position + 1 : 1

    // Add track to playlist
    const playlistTrack = await db.playlistTrack.create({
      data: {
        playlistId: playlistId,
        trackId: trackId,
        position: nextPosition
      }
    })

    return NextResponse.json({
      success: true,
      playlistTrack: {
        id: playlistTrack.id,
        position: playlistTrack.position,
        addedAt: playlistTrack.addedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Error adding track to playlist:", error)
    return NextResponse.json(
      { error: "Failed to add track to playlist" },
      { status: 500 }
    )
  }
}

// DELETE - Remove track from playlist
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to remove tracks from playlists" },
        { status: 401 }
      )
    }

    const { playlistId } = await context.params
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
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

    // Verify user owns the playlist
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id
      }
    })

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      )
    }

    // Find and remove the playlist track
    const playlistTrack = await db.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId: playlistId,
          trackId: trackId
        }
      }
    })

    if (!playlistTrack) {
      return NextResponse.json(
        { error: "Track not found in this playlist" },
        { status: 404 }
      )
    }

    // Remove the track from playlist and reorder remaining tracks
    await db.$transaction(async (tx) => {
      // Delete the playlist track
      await tx.playlistTrack.delete({
        where: {
          playlistId_trackId: {
            playlistId: playlistId,
            trackId: trackId
          }
        }
      })

      // Reorder remaining tracks to fill the gap
      await tx.playlistTrack.updateMany({
        where: {
          playlistId: playlistId,
          position: { gt: playlistTrack.position }
        },
        data: {
          position: { decrement: 1 }
        }
      })
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error removing track from playlist:", error)
    return NextResponse.json(
      { error: "Failed to remove track from playlist" },
      { status: 500 }
    )
  }
}