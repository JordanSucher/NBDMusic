// /api/user/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in" },
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

    // Get follower count
    const followerCount = await db.follow.count({
      where: { followingId: user.id }
    })

    // Get following count
    const followingCount = await db.follow.count({
      where: { followerId: user.id }
    })

    // Get followers list (recent followers)
    const recentFollowers = await db.follow.findMany({
      where: { followingId: user.id },
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
      where: { followerId: user.id },
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
