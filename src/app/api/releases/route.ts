import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const releases = await db.release.findMany({
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
        },
        tracks: {
          orderBy: {
            trackNumber: 'asc'
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      ...(limit && { take: limit })
    })

    return NextResponse.json({
      releases
    })
  } catch (error) {
    console.error("Error fetching releases:", error)
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    )
  }
}
