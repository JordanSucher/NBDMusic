import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = decodeURIComponent(params.username)

    // Find the user
    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get user's songs with tags
    const songs = await db.song.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            username: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    // Calculate stats
    const totalFileSize = songs.reduce((total: number, song: { fileSize: number }) => total + song.fileSize, 0)
    
    // Get all unique tags
    const allTagsSet = new Set<string>()
    songs.forEach((song: { tags: { tag: { name: string } }[] }) => {
      song.tags.forEach((songTag: { tag: { name: string } }) => {
        allTagsSet.add(songTag.tag.name)
      })
    })
    const allTags = Array.from(allTagsSet).sort()

    const profile = {
      username: user.username,
      songCount: songs.length,
      totalFileSize,
      joinedAt: user.createdAt.toISOString(),
      allTags
    }

    return NextResponse.json({
      profile,
      songs
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    )
  }
}
