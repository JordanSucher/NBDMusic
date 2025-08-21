import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const { trackId, duration } = await request.json()

    if (!trackId || typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json(
        { error: "Invalid trackId or duration" },
        { status: 400 }
      )
    }

    // Update the track's duration
    const updatedTrack = await db.track.update({
      where: { id: trackId },
      data: { duration: Math.floor(duration) },
      select: { id: true, title: true, duration: true }
    })

    return NextResponse.json({
      message: "Track duration updated successfully",
      track: updatedTrack
    })

  } catch (error) {
    console.error("Error updating track duration:", error)
    return NextResponse.json(
      { error: "Failed to update track duration" },
      { status: 500 }
    )
  }
}