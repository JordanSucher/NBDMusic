import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

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
      },
      ...(limit && { take: limit })
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
