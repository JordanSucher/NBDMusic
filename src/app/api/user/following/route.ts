// /src/app/api/user/following/route.ts
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

    // Get all users the current user follows
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
      following: following.map(f => ({
        username: f.following.username,
        name: f.following.name,
        followedAt: f.createdAt
      }))
    })

  } catch (error) {
    console.error("Error fetching following:", error)
    return NextResponse.json(
      { error: "Failed to fetch following list" },
      { status: 500 }
    )
  }
}
