import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { playlistId } = await context.params
    const { trackUpdates } = await request.json()

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify the user owns the playlist
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id
      }
    })

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      )
    }

    // Update positions for all tracks in a transaction
    await prisma.$transaction(async (tx) => {
      for (const update of trackUpdates) {
        await tx.playlistTrack.updateMany({
          where: {
            playlistId: playlistId,
            trackId: update.trackId
          },
          data: {
            position: update.position
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering playlist tracks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}