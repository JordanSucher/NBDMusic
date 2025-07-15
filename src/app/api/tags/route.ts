import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const tags = await db.tag.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      tags: tags.map((tag: { name: string }) => tag.name)
    })
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    )
  }
}
