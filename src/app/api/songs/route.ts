import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const songs = await db.song.findMany({
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

    return NextResponse.json({
      songs
    })
  } catch (error) {
    console.error("Error fetching songs:", error)
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    )
  }
}
