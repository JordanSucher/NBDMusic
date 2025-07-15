import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// Add a tag to a song
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const songId = params.id
    const { tagName } = await request.json()

    if (!tagName?.trim()) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      )
    }

    // Verify song ownership
    const song = await db.song.findUnique({
      where: { id: songId }
    })

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      )
    }

    if (song.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit tags on your own songs" },
        { status: 403 }
      )
    }

    const cleanTagName = tagName.trim().toLowerCase()

    // Find or create the tag
    let tag = await db.tag.findUnique({
      where: { name: cleanTagName }
    })

    if (!tag) {
      tag = await db.tag.create({
        data: { name: cleanTagName }
      })
    }

    // Check if relationship already exists
    const existingRelation = await db.songTag.findUnique({
      where: {
        songId_tagId: {
          songId: songId,
          tagId: tag.id
        }
      }
    })

    if (existingRelation) {
      return NextResponse.json(
        { error: "Tag already exists on this song" },
        { status: 400 }
      )
    }

    // Create the relationship
    await db.songTag.create({
      data: {
        songId: songId,
        tagId: tag.id
      }
    })

    return NextResponse.json({
      message: "Tag added successfully",
      tagName: cleanTagName
    })
  } catch (error) {
    console.error("Error adding tag:", error)
    return NextResponse.json(
      { error: "Failed to add tag" },
      { status: 500 }
    )
  }
}

// Remove a tag from a song
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const songId = params.id
    const { tagName } = await request.json()

    if (!tagName?.trim()) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      )
    }

    // Verify song ownership
    const song = await db.song.findUnique({
      where: { id: songId }
    })

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      )
    }

    if (song.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit tags on your own songs" },
        { status: 403 }
      )
    }

    const cleanTagName = tagName.trim().toLowerCase()

    // Find the tag
    const tag = await db.tag.findUnique({
      where: { name: cleanTagName }
    })

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      )
    }

    // Delete the relationship
    await db.songTag.delete({
      where: {
        songId_tagId: {
          songId: songId,
          tagId: tag.id
        }
      }
    })

    return NextResponse.json({
      message: "Tag removed successfully"
    })
  } catch (error) {
    console.error("Error removing tag:", error)
    return NextResponse.json(
      { error: "Failed to remove tag" },
      { status: 500 }
    )
  }
}
