// /api/follow/[username]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// POST - Follow a user
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to follow users" },
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

    const { username } = await context.params
    const decodedUsername = decodeURIComponent(username)

    // Find the user to follow
    const userToFollow = await db.user.findUnique({
      where: { username: decodedUsername },
      select: { id: true, username: true }
    })

    if (!userToFollow) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Can't follow yourself
    if (userToFollow.id === user.id) {
      return NextResponse.json(
        { error: "You cannot follow yourself" },
        { status: 400 }
      )
    }

    // Check if already following
    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userToFollow.id
        }
      }
    })

    if (existingFollow) {
      return NextResponse.json(
        { error: "You are already following this user" },
        { status: 400 }
      )
    }

    // Create follow relationship
    await db.follow.create({
      data: {
        followerId: user.id,
        followingId: userToFollow.id
      }
    })

    return NextResponse.json({
      message: `You are now following ${userToFollow.username}`,
      following: true
    })

  } catch (error) {
    console.error("Error following user:", error)
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 }
    )
  }
}

// DELETE - Unfollow a user
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
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

    const { username } = await context.params
    const decodedUsername = decodeURIComponent(username)

    // Find the user to unfollow
    const userToUnfollow = await db.user.findUnique({
      where: { username: decodedUsername },
      select: { id: true, username: true }
    })

    if (!userToUnfollow) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Delete follow relationship
    const deletedFollow = await db.follow.deleteMany({
      where: {
        followerId: user.id,
        followingId: userToUnfollow.id
      }
    })

    if (deletedFollow.count === 0) {
      return NextResponse.json(
        { error: "You are not following this user" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `You are no longer following ${userToUnfollow.username}`,
      following: false
    })

  } catch (error) {
    console.error("Error unfollowing user:", error)
    return NextResponse.json(
      { error: "Failed to unfollow user" },
      { status: 500 }
    )
  }
}

// GET - Check if following a user
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ following: false })
    }

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!currentUser) {
      return NextResponse.json({ following: false })
    }

    const { username } = await context.params
    const decodedUsername = decodeURIComponent(username)

    // Find the user
    const targetUser = await db.user.findUnique({
      where: { username: decodedUsername },
      select: { id: true }
    })

    if (!targetUser) {
      return NextResponse.json({ following: false })
    }

    // Check if following
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUser.id
        }
      }
    })

    return NextResponse.json({ following: !!follow })

  } catch (error) {
    console.error("Error checking follow status:", error)
    return NextResponse.json({ following: false })
  }
}
