import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { playlistId } = params
    const { isPublic } = await request.json()

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update playlist privacy - only if user owns it
    const updatedPlaylist = await prisma.playlist.updateMany({
      where: {
        id: playlistId,
        userId: user.id
      },
      data: {
        isPublic: isPublic
      }
    })

    if (updatedPlaylist.count === 0) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, isPublic })
  } catch (error) {
    console.error("Error updating playlist privacy:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}