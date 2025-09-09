import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// GET - Get user's liked songs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to view liked songs" },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, username: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Find user's "Liked Songs" playlist
    const likedSongsPlaylist = await db.playlist.findFirst({
      where: {
        userId: user.id,
        name: "Liked Songs",
        isSystem: true
      },
      include: {
        tracks: {
          include: {
            track: {
              include: {
                release: {
                  include: {
                    user: {
                      select: {
                        username: true
                      }
                    }
                  }
                },
                listens: true
              }
            }
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    })

    if (!likedSongsPlaylist) {
      // No liked songs playlist exists yet
      return NextResponse.json({
        playlist: {
          id: null,
          name: "Liked Songs",
          description: "Your liked tracks",
          trackCount: 0,
          createdAt: null,
          updatedAt: null
        },
        tracks: []
      })
    }

    // Format the response
    const formattedTracks = likedSongsPlaylist.tracks.map((playlistTrack) => ({
      id: playlistTrack.track.id,
      title: playlistTrack.track.title,
      trackNumber: playlistTrack.track.trackNumber,
      duration: playlistTrack.track.duration,
      fileUrl: playlistTrack.track.fileUrl,
      lyrics: playlistTrack.track.lyrics,
      addedAt: playlistTrack.addedAt,
      position: playlistTrack.position,
      release: {
        id: playlistTrack.track.release.id,
        title: playlistTrack.track.release.title,
        releaseType: playlistTrack.track.release.releaseType,
        artworkUrl: playlistTrack.track.release.artworkUrl,
        releaseDate: playlistTrack.track.release.releaseDate
      },
      artist: playlistTrack.track.release.user.username,
      listenCount: playlistTrack.track.listens.length
    }))

    return NextResponse.json({
      playlist: {
        id: likedSongsPlaylist.id,
        name: likedSongsPlaylist.name,
        description: likedSongsPlaylist.description,
        trackCount: likedSongsPlaylist.tracks.length,
        createdAt: likedSongsPlaylist.createdAt,
        updatedAt: likedSongsPlaylist.updatedAt
      },
      tracks: formattedTracks
    })

  } catch (error) {
    console.error("Error getting liked songs:", error)
    return NextResponse.json(
      { error: "Failed to get liked songs" },
      { status: 500 }
    )
  }
}