import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  try {
    const { playlistId } = params
    const session = await getServerSession(authOptions)
    
    // Get current user if logged in
    let currentUser = null
    if (session?.user?.email) {
      currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
    }

    // Find the playlist (remove isPublic requirement for sharing)
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId
      },
      include: {
        user: {
          select: {
            username: true,
            name: true
          }
        },
        tracks: {
          orderBy: {
            position: 'asc'
          },
          include: {
            track: {
              include: {
                release: {
                  include: {
                    user: {
                      select: {
                        username: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      )
    }

    // Check if current user owns this playlist
    const isOwner = currentUser && currentUser.id === playlist.userId

    // Transform the data to match expected format
    const transformedPlaylist = {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.tracks.length,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
        owner: {
          username: playlist.user.username,
          name: playlist.user.name
        },
        isOwner: isOwner
      },
      tracks: playlist.tracks.map(pt => ({
        id: pt.track.id,
        title: pt.track.title,
        trackNumber: pt.track.trackNumber,
        duration: pt.track.duration,
        fileUrl: pt.track.fileUrl,
        lyrics: pt.track.lyrics,
        addedAt: pt.addedAt.toISOString(),
        position: pt.position,
        release: {
          id: pt.track.release.id,
          title: pt.track.release.title,
          releaseType: pt.track.release.releaseType,
          artworkUrl: pt.track.release.artworkUrl,
          releaseDate: pt.track.release.releaseDate?.toISOString() || null
        },
        artist: pt.track.release.user.username,
        listenCount: 0 // We could add listen count here if needed
      }))
    }

    return NextResponse.json(transformedPlaylist)
  } catch (error) {
    console.error("Error fetching public playlist:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}