import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const { username } = params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Find the user
    const user = await db.user.findUnique({
      where: { username },
      select: { id: true, username: true, name: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Calculate date cutoff (0 days = no date filter)
    const dateFilter = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null

    // Build where conditions
    const listenWhereCondition: Record<string, unknown> = {
      userId: user.id
    }
    if (dateFilter) {
      listenWhereCondition.listenedAt = { gte: dateFilter }
    }

    // Get total listens for this user
    const totalListens = await db.listen.count({
      where: listenWhereCondition
    })

    // Get top artists this user listens to
    const artistListens = await db.listen.findMany({
      where: listenWhereCondition,
      select: {
        track: {
          select: {
            release: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Group by artist
    const artistGroups = artistListens.reduce((acc, listen) => {
      const artistId = listen.track.release.user.id
      if (!acc[artistId]) {
        acc[artistId] = {
          artist: listen.track.release.user,
          listenCount: 0
        }
      }
      acc[artistId].listenCount++
      return acc
    }, {} as Record<string, { artist: { id: string; username: string; name: string | null }; listenCount: number }>)

    const topArtists = Object.values(artistGroups)
      .sort((a, b) => b.listenCount - a.listenCount)
      .slice(0, limit)

    // Get top tracks this user listens to
    const trackListens = await db.listen.groupBy({
      by: ['trackId'],
      where: listenWhereCondition,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: limit
    })

    const topTracks = await Promise.all(
      trackListens.map(async (stat) => {
        const track = await db.track.findUnique({
          where: { id: stat.trackId },
          select: {
            id: true,
            title: true,
            release: {
              select: {
                title: true,
                user: {
                  select: {
                    username: true,
                    name: true
                  }
                }
              }
            }
          }
        })

        return {
          track: {
            id: track!.id,
            title: track!.title,
            artist: track!.release.user,
            release: { title: track!.release.title }
          },
          listenCount: stat._count.id
        }
      })
    )

    // Get unique tracks and artists counts
    const uniqueTracksCount = await db.listen.findMany({
      where: listenWhereCondition,
      select: { trackId: true },
      distinct: ['trackId']
    })

    const uniqueArtistsCount = new Set(
      artistListens.map(listen => listen.track.release.user.id)
    ).size

    // Get listening activity over time (last 30 days)
    const activityData = await db.listen.groupBy({
      by: ['listenedAt'],
      where: {
        userId: user.id,
        listenedAt: { 
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      _count: {
        id: true
      }
    })

    // Group by day
    const dailyActivity = activityData.reduce((acc, item) => {
      const date = new Date(item.listenedAt).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date] += item._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      user: {
        username: user.username,
        name: user.name
      },
      stats: {
        totalListens,
        uniqueTracks: uniqueTracksCount.length,
        uniqueArtists: uniqueArtistsCount,
        topArtists,
        topTracks,
        dailyActivity
      },
      filters: {
        days,
        limit
      }
    })

  } catch (error) {
    console.error("Error fetching user stats:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: "Failed to fetch user stats", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}