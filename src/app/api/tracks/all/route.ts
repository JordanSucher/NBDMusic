import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const tracks = await db.track.findMany({
      include: {
        release: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            listens: true
          }
        }
      }
    })

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error("Failed to fetch all tracks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    )
  }
}