import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const { username } = await params
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

        if (!track) return null

        return {
          track: {
            id: track.id,
            title: track.title,
            artist: track.release.user,
            release: { title: track.release.title }
          },
          listenCount: stat._count.id
        }
      })
    ).then(results => results.filter(result => result !== null))

    // Get unique tracks and artists counts
    const uniqueTracksCount = await db.listen.findMany({
      where: listenWhereCondition,
      select: { trackId: true },
      distinct: ['trackId']
    })

    const uniqueArtistsCount = new Set(
      artistListens.map(listen => listen.track.release.user.id)
    ).size

    // Get who is listening to this user's tracks
    const listenerWhereCondition: Record<string, unknown> = {
      track: {
        release: {
          userId: user.id
        }
      },
      userId: { not: null } // Only authenticated users
    }
    if (dateFilter) {
      listenerWhereCondition.listenedAt = { gte: dateFilter }
    }

    // Get top listeners of this user's music
    const listenerStats = await db.listen.groupBy({
      by: ['userId'],
      where: listenerWhereCondition,
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

    const topListeners = await Promise.all(
      listenerStats.map(async (stat) => {
        if (!stat.userId) return null
        
        const listener = await db.user.findUnique({
          where: { id: stat.userId },
          select: { username: true, name: true }
        })

        if (!listener) return null

        return {
          listener: {
            username: listener.username,
            name: listener.name
          },
          listenCount: stat._count.id
        }
      })
    ).then(results => results.filter(result => result !== null))

    // Get total listens to this user's music (including anonymous)
    const totalListensToUser = await db.listen.count({
      where: {
        track: {
          release: {
            userId: user.id
          }
        },
        ...(dateFilter && { listenedAt: { gte: dateFilter } })
      }
    })

    // Get anonymous listens to this user's music
    const anonymousListensToUser = await db.listen.count({
      where: {
        track: {
          release: {
            userId: user.id
          }
        },
        userId: null,
        ...(dateFilter && { listenedAt: { gte: dateFilter } })
      }
    })

    const authenticatedListensToUser = totalListensToUser - anonymousListensToUser

    // Get unique listener count (authenticated users only)
    const uniqueListeners = await db.listen.findMany({
      where: {
        track: {
          release: {
            userId: user.id
          }
        },
        userId: { not: null },
        ...(dateFilter && { listenedAt: { gte: dateFilter } })
      },
      select: { userId: true },
      distinct: ['userId']
    })

    return NextResponse.json({
      user: {
        username: user.username,
        name: user.name
      },
      stats: {
        // User's listening activity
        totalListens: totalListens || 0,
        uniqueTracks: uniqueTracksCount?.length || 0,
        uniqueArtists: uniqueArtistsCount || 0,
        topArtists: topArtists || [],
        topTracks: topTracks || [],
        // Who listens to this user's music
        listenerStats: {
          totalListensToUser: totalListensToUser || 0,
          totalListeners: uniqueListeners?.length || 0,
          authenticatedListensToUser: authenticatedListensToUser || 0,
          anonymousListensToUser: anonymousListensToUser || 0,
          topListeners: topListeners || []
        }
      },
      filters: {
        days: days || 0,
        limit: limit || 10
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