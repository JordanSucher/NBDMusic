import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params
    const decodedUsername = decodeURIComponent(username)

    // Find the user
    const user = await db.user.findUnique({
      where: { username: decodedUsername },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        url: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get user's releases with tracks and tags
    const releases = await db.release.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            username: true
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
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    // Calculate stats
    const totalDuration = releases.reduce((total, release) => {
      return total + release.tracks.reduce((releaseTotal, track) => releaseTotal + (track.duration || 0), 0)
    }, 0)
    
    const trackCount = releases.reduce((total, release) => total + release.tracks.length, 0)
    
    // Get all unique tags
    const allTagsSet = new Set<string>()
    releases.forEach(release => {
      release.tags.forEach(releaseTag => {
        allTagsSet.add(releaseTag.tag.name)
      })
    })
    const allTags = Array.from(allTagsSet).sort()

    // Count release types
    const releaseTypeCounts = {
      single: 0,
      ep: 0,
      album: 0,
      demo: 0
    }
    
    releases.forEach(release => {
      const type = release.releaseType as keyof typeof releaseTypeCounts
      if (type in releaseTypeCounts) {
        releaseTypeCounts[type]++
      }
    })

    // Get follow counts
    const followerCount = await db.follow.count({
      where: { followingId: user.id }
    })

    const followingCount = await db.follow.count({
      where: { followerId: user.id }
    })

    const profile = {
      username: user.username,
      name: user.name,
      bio: user.bio,
      url: user.url,
      releaseCount: releases.length,
      trackCount,
      totalDuration,
      joinedAt: user.createdAt.toISOString(),
      allTags,
      releaseTypeCounts,
      followerCount,
      followingCount
    }

    return NextResponse.json({
      profile,
      releases
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    )
  }
}
