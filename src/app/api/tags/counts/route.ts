import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const tags = await db.tag.findMany({
      include: {
        _count: {
          select: {
            releases: true
          }
        }
      },
      orderBy: [
        {
          releases: {
            _count: 'desc'
          }
        },
        {
          name: 'asc'
        }
      ]
    })

    const tagsWithCounts = tags.map(tag => ({
      name: tag.name,
      count: tag._count.releases
    }))

    return NextResponse.json({
      tags: tagsWithCounts
    })
  } catch (error) {
    console.error("Error fetching tags with counts:", error)
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    )
  }
}
