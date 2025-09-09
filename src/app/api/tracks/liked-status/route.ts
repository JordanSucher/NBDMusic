import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// POST - Check if tracks are liked (batch endpoint)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to check liked status" },
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

    const { trackIds } = await request.json()

    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      return NextResponse.json(
        { error: "trackIds must be a non-empty array" },
        { status: 400 }
      )
    }

    // Find user's "Liked Songs" playlist
    const likedSongsPlaylist = await db.playlist.findFirst({
      where: {
        userId: user.id,
        name: "Liked Songs",
        isSystem: true
      }
    })

    if (!likedSongsPlaylist) {
      // No liked songs playlist exists, so nothing is liked
      const likedStatus: Record<string, boolean> = {}
      trackIds.forEach((trackId: string) => {
        likedStatus[trackId] = false
      })
      return NextResponse.json({ likedStatus })
    }

    // Get all liked tracks from the playlist
    const likedTracks = await db.playlistTrack.findMany({
      where: {
        playlistId: likedSongsPlaylist.id,
        trackId: { in: trackIds }
      },
      select: { trackId: true }
    })

    // Create a map of liked track IDs
    const likedTrackIds = new Set(likedTracks.map(track => track.trackId))

    // Build the response object
    const likedStatus: Record<string, boolean> = {}
    trackIds.forEach((trackId: string) => {
      likedStatus[trackId] = likedTrackIds.has(trackId)
    })

    return NextResponse.json({ likedStatus })

  } catch (error) {
    console.error("Error checking liked status:", error)
    return NextResponse.json(
      { error: "Failed to check liked status" },
      { status: 500 }
    )
  }
}