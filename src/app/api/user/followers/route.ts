// /src/app/api/user/followers/route.ts
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

    // Get all followers
    const followers = await db.follow.findMany({
      where: { followingId: user.id },
      include: {
        follower: {
          select: {
            username: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      followers: followers.map(f => ({
        username: f.follower.username,
        name: f.follower.name,
        followedAt: f.createdAt
      }))
    })

  } catch (error) {
    console.error("Error fetching followers:", error)
    return NextResponse.json(
      { error: "Failed to fetch followers" },
      { status: 500 }
    )
  }
}
