import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { del } from "@vercel/blob"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await context.params
    
    // Check authentication
    const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    // Find the song and verify ownership
    const song = await db.song.findUnique({
      where: { id: songId },
      include: {
        tags: true
      }
    })

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      )
    }

    if (song.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own songs" },
        { status: 403 }
      )
    }

    // Delete from Vercel Blob storage
    try {
      await del(song.fileUrl)
    } catch (blobError) {
      console.error("Failed to delete from blob storage:", blobError)
      // Continue with database deletion even if blob deletion fails
    }

    // Delete song tags (cascade should handle this, but being explicit)
    await db.songTag.deleteMany({
      where: { songId: song.id }
    })

    // Delete the song from database
    await db.song.delete({
      where: { id: songId }
    })

    return NextResponse.json({
      message: "Song deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting song:", error)
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    )
  }
}
