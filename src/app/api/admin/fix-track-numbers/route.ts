import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const { releaseId } = await request.json()

    if (!releaseId) {
      return NextResponse.json(
        { error: "Release ID is required" },
        { status: 400 }
      )
    }

    // Get the release with its tracks in their current order
    const release = await db.release.findUnique({
      where: { id: releaseId },
      select: {
        id: true,
        title: true,
        tracks: {
          select: {
            id: true,
            title: true,
            trackNumber: true
          },
          orderBy: {
            trackNumber: 'asc' // Get them in their current numerical order
          }
        }
      }
    })

    if (!release) {
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      )
    }

    if (release.tracks.length === 0) {
      return NextResponse.json(
        { error: "Release has no tracks" },
        { status: 400 }
      )
    }

    // Prepare updates - renumber tracks sequentially starting from 1
    const updates = release.tracks.map((track, index) => ({
      trackId: track.id,
      oldNumber: track.trackNumber,
      newNumber: index + 1,
      title: track.title
    }))

    // Only update tracks that actually need to change
    const tracksToUpdate = updates.filter(update => update.oldNumber !== update.newNumber)

    if (tracksToUpdate.length === 0) {
      return NextResponse.json({
        message: "No track numbers needed updating",
        updates: []
      })
    }

    // Perform the updates in a transaction
    await db.$transaction(
      tracksToUpdate.map(update => 
        db.track.update({
          where: { id: update.trackId },
          data: { trackNumber: update.newNumber }
        })
      )
    )

    console.log(`✅ Fixed track numbers for release "${release.title}":`)
    tracksToUpdate.forEach(update => {
      console.log(`  - "${update.title}": ${update.oldNumber} → ${update.newNumber}`)
    })

    return NextResponse.json({
      message: `Successfully updated ${tracksToUpdate.length} track numbers`,
      updates: tracksToUpdate,
      release: {
        id: release.id,
        title: release.title
      }
    })

  } catch (error) {
    console.error("Error fixing track numbers:", error)
    return NextResponse.json(
      { error: "Failed to fix track numbers" },
      { status: 500 }
    )
  }
}