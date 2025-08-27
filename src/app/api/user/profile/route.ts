import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        url: true,
        email: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, bio, url } = body

    // Validate input
    if (bio && typeof bio !== 'string') {
      return NextResponse.json(
        { error: "Bio must be a string" },
        { status: 400 }
      )
    }

    if (url && typeof url !== 'string') {
      return NextResponse.json(
        { error: "URL must be a string" },
        { status: 400 }
      )
    }

    if (name && typeof name !== 'string') {
      return NextResponse.json(
        { error: "Name must be a string" },
        { status: 400 }
      )
    }

    // Limit lengths
    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio cannot exceed 500 characters" },
        { status: 400 }
      )
    }

    if (url && url.length > 200) {
      return NextResponse.json(
        { error: "URL cannot exceed 200 characters" },
        { status: 400 }
      )
    }

    if (name && name.length > 50) {
      return NextResponse.json(
        { error: "Name cannot exceed 50 characters" },
        { status: 400 }
      )
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Update the user profile
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: name !== undefined ? name : undefined,
        bio: bio !== undefined ? bio : undefined,
        url: url !== undefined ? url : undefined
      },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        url: true
      }
    })

    return NextResponse.json({
      user: updatedUser
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    )
  }
}