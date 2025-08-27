import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    // Check authentication
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

    // Get user's releases
    const releases = await db.release.findMany({
      where: {
        userId: user.id
      },
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
          include: {
            _count: {
              select: {
                listens: true
              }
            }
          },
          orderBy: {
            trackNumber: 'asc'
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return NextResponse.json({
      releases
    })
  } catch (error) {
    console.error("Error fetching user releases:", error)
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    )
  }
}
