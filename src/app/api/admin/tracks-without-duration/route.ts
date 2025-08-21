import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    // Get all tracks without duration data
    const tracks = await db.track.findMany({
      where: {
        OR: [
          { duration: null },
          { duration: 0 }
        ]
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        duration: true
      },
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json({
      tracks,
      count: tracks.length
    })

  } catch (error) {
    console.error("Error fetching tracks without duration:", error)
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    )
  }
}