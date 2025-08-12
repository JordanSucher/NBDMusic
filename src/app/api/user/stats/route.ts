// /api/user/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    // Get follower count
    const followerCount = await db.follow.count({
      where: { followingId: session.user.id }
    })

    // Get following count
    const followingCount = await db.follow.count({
      where: { followerId: session.user.id }
    })

    // Get followers list (recent followers)
    const recentFollowers = await db.follow.findMany({
      where: { followingId: session.user.id },
      include: {
        follower: {
          select: {
            username: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Get following list
    const following = await db.follow.findMany({
      where: { followerId: session.user.id },
      include: {
        following: {
          select: {
            username: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      followerCount,
      followingCount,
      recentFollowers: recentFollowers.map(f => ({
        username: f.follower.username,
        name: f.follower.name,
        followedAt: f.createdAt
      })),
      following: following.map(f => ({
        username: f.following.username,
        name: f.following.name,
        followedAt: f.createdAt
      }))
    })

  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
