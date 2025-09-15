import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// GET - Get all user playlists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to view playlists" },
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

    // Get all user playlists with track counts
    const playlists = await db.playlist.findMany({
      where: {
        userId: user.id
      },
      include: {
        tracks: {
          select: { id: true }
        }
      },
      orderBy: [
        { isSystem: 'desc' }, // System playlists first (Liked Songs)
        { createdAt: 'desc' }
      ]
    })

    const formattedPlaylists = playlists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      isSystem: playlist.isSystem,
      isPublic: playlist.isPublic,
      trackCount: playlist.tracks.length,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt
    }))

    return NextResponse.json({ playlists: formattedPlaylists })

  } catch (error) {
    console.error("Error getting playlists:", error)
    return NextResponse.json(
      { error: "Failed to get playlists" },
      { status: 500 }
    )
  }
}

// POST - Create new playlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to create playlists" },
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

    const { name, description } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Playlist name is required" },
        { status: 400 }
      )
    }

    // Check if playlist name already exists for this user
    const existingPlaylist = await db.playlist.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: name.trim()
        }
      }
    })

    if (existingPlaylist) {
      return NextResponse.json(
        { error: "A playlist with this name already exists" },
        { status: 400 }
      )
    }

    // Create the playlist
    const playlist = await db.playlist.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: user.id,
        isSystem: false,
        isPublic: false
      }
    })

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isSystem: playlist.isSystem,
        isPublic: playlist.isPublic,
        trackCount: 0,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating playlist:", error)
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    )
  }
}