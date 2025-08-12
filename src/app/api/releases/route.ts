import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const followingOnly = searchParams.get('following') === 'true'
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    let whereCondition = {}

    // If following filter is requested, get user's following list
    if (followingOnly) {
      const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "You must be logged in to filter by following" },
          { status: 401 }
        )
      }

      // Get list of users the current user follows
      const following = await db.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true }
      })

      const followingUserIds = following.map(f => f.followingId)

      // If user doesn't follow anyone, return empty results
      if (followingUserIds.length === 0) {
        return NextResponse.json({ releases: [] })
      }

      whereCondition = {
        userId: {
          in: followingUserIds
        }
      }
    }

    const releases = await db.release.findMany({
      where: whereCondition,
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
