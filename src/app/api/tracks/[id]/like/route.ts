import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// POST - Like a track (add to Liked Songs playlist)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to like tracks" },
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

    const { id: trackId } = await context.params

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

    // Find or create user's "Liked Songs" playlist
    let likedSongsPlaylist = await db.playlist.findFirst({
      where: {
        userId: user.id,
        name: "Liked Songs",
        isSystem: true
      }
    })

    if (!likedSongsPlaylist) {
      // Create the Liked Songs playlist for this user
      likedSongsPlaylist = await db.playlist.create({
        data: {
          name: "Liked Songs",
          description: "Your liked tracks",
          isSystem: true,
          isPublic: false,
          userId: user.id
        }
      })
    }

    // Check if track is already liked
    const existingLike = await db.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId: likedSongsPlaylist.id,
          trackId: trackId
        }
      }
    })

    if (existingLike) {
      return NextResponse.json(
        { error: "Track is already liked" },
        { status: 400 }
      )
    }

    // Get the next position in the playlist
    const lastTrack = await db.playlistTrack.findFirst({
      where: { playlistId: likedSongsPlaylist.id },
      orderBy: { position: 'desc' }
    })

    const nextPosition = lastTrack ? lastTrack.position + 1 : 1

    // Add track to Liked Songs playlist
    const playlistTrack = await db.playlistTrack.create({
      data: {
        playlistId: likedSongsPlaylist.id,
        trackId: trackId,
        position: nextPosition
      }
    })

    return NextResponse.json({
      message: "Track liked successfully",
      liked: true,
      playlistTrackId: playlistTrack.id
    })

  } catch (error) {
    console.error("Error liking track:", error)
    return NextResponse.json(
      { error: "Failed to like track" },
      { status: 500 }
    )
  }
}

// DELETE - Unlike a track (remove from Liked Songs playlist)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to unlike tracks" },
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

    const { id: trackId } = await context.params

    // Find user's "Liked Songs" playlist
    const likedSongsPlaylist = await db.playlist.findFirst({
      where: {
        userId: user.id,
        name: "Liked Songs",
        isSystem: true
      }
    })

    if (!likedSongsPlaylist) {
      return NextResponse.json(
        { error: "Track is not liked" },
        { status: 400 }
      )
    }

    // Find the liked track entry
    const likedTrack = await db.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId: likedSongsPlaylist.id,
          trackId: trackId
        }
      }
    })

    if (!likedTrack) {
      return NextResponse.json(
        { error: "Track is not liked" },
        { status: 400 }
      )
    }

    // Remove track from Liked Songs playlist
    await db.playlistTrack.delete({
      where: {
        id: likedTrack.id
      }
    })

    // Reorder remaining tracks to fill the gap
    await db.playlistTrack.updateMany({
      where: {
        playlistId: likedSongsPlaylist.id,
        position: {
          gt: likedTrack.position
        }
      },
      data: {
        position: {
          decrement: 1
        }
      }
    })

    return NextResponse.json({
      message: "Track unliked successfully",
      liked: false
    })

  } catch (error) {
    console.error("Error unliking track:", error)
    return NextResponse.json(
      { error: "Failed to unlike track" },
      { status: 500 }
    )
  }
}