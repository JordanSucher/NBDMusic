import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// GET - Get playlist details with tracks
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to view playlists" },
        { status: 401 }
      )
    }

    const { playlistId } = await context.params

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

    // Get playlist with tracks
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id
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

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      )
    }

    // Format the response
    const formattedTracks = playlist.tracks.map((playlistTrack) => ({
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
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isSystem: playlist.isSystem,
        isPublic: playlist.isPublic,
        trackCount: playlist.tracks.length,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt
      },
      tracks: formattedTracks
    })

  } catch (error) {
    console.error("Error getting playlist:", error)
    return NextResponse.json(
      { error: "Failed to get playlist" },
      { status: 500 }
    )
  }
}

// PUT - Update playlist details
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to update playlists" },
        { status: 401 }
      )
    }

    const { playlistId } = await context.params
    const { name, description } = await request.json()

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

    // Verify user owns the playlist and it's not a system playlist
    const existingPlaylist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id,
        isSystem: false // Can't edit system playlists
      }
    })

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: "Playlist not found, access denied, or cannot edit system playlist" },
        { status: 404 }
      )
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Playlist name is required" },
        { status: 400 }
      )
    }

    // Check if new name conflicts with existing playlist (excluding current one)
    if (name.trim() !== existingPlaylist.name) {
      const nameConflict = await db.playlist.findFirst({
        where: {
          userId: user.id,
          name: name.trim(),
          NOT: { id: playlistId }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "A playlist with this name already exists" },
          { status: 400 }
        )
      }
    }

    // Update the playlist
    const updatedPlaylist = await db.playlist.update({
      where: { id: playlistId },
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    })

    return NextResponse.json({
      playlist: {
        id: updatedPlaylist.id,
        name: updatedPlaylist.name,
        description: updatedPlaylist.description,
        isSystem: updatedPlaylist.isSystem,
        isPublic: updatedPlaylist.isPublic,
        createdAt: updatedPlaylist.createdAt,
        updatedAt: updatedPlaylist.updatedAt
      }
    })

  } catch (error) {
    console.error("Error updating playlist:", error)
    return NextResponse.json(
      { error: "Failed to update playlist" },
      { status: 500 }
    )
  }
}

// DELETE - Delete playlist
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to delete playlists" },
        { status: 401 }
      )
    }

    const { playlistId } = await context.params

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

    // Verify user owns the playlist and it's not a system playlist
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id,
        isSystem: false // Can't delete system playlists
      }
    })

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found, access denied, or cannot delete system playlist" },
        { status: 404 }
      )
    }

    // Delete the playlist (cascade will handle playlist tracks)
    await db.playlist.delete({
      where: { id: playlistId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error deleting playlist:", error)
    return NextResponse.json(
      { error: "Failed to delete playlist" },
      { status: 500 }
    )
  }
}