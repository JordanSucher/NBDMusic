import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '20')
    const minListens = parseInt(searchParams.get('minListens') || '1')
    const artistFilter = searchParams.get('artistFilter')

    // Calculate date cutoff (0 days = no date filter)
    const dateFilter = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null

    // Build where conditions
    const listenWhereCondition: Record<string, unknown> = {}
    if (dateFilter) {
      listenWhereCondition.listenedAt = { gte: dateFilter }
    }

    // Artist filter conditions
    const artistWhereCondition: Record<string, unknown> = {}
    if (artistFilter) {
      artistWhereCondition.OR = [
        { username: { contains: artistFilter, mode: 'insensitive' } },
        { name: { contains: artistFilter, mode: 'insensitive' } }
      ]
    }

    // Track filter for artist filtering
    const trackWhereCondition: Record<string, unknown> = {}
    if (artistFilter) {
      trackWhereCondition.user = artistWhereCondition
    }

    // If we have track conditions, add them to listen conditions
    if (Object.keys(trackWhereCondition).length > 0) {
      listenWhereCondition.track = trackWhereCondition
    }

    // Get top listeners (exclude null userIds)
    const listenerStats = await db.listen.groupBy({
      by: ['userId'],
      where: {
        ...listenWhereCondition,
        userId: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      having: {
        id: {
          _count: {
            gte: minListens
          }
        }
      },
      take: limit
    })

    // Get detailed listener info with additional stats
    const listeners = await Promise.all(
      listenerStats.map(async (stat) => {
        const user = await db.user.findUnique({
          where: { id: stat.userId },
          select: { username: true, name: true }
        })

        // Get unique tracks and artists for this listener
        const uniqueStats = await db.listen.findMany({
          where: {
            userId: stat.userId,
            ...(dateFilter && { listenedAt: { gte: dateFilter } }),
            ...(Object.keys(trackWhereCondition).length > 0 && { track: trackWhereCondition })
          },
          select: {
            track: {
              select: {
                id: true,
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

        const uniqueTrackIds = new Set(uniqueStats.map(l => l.track.id))
        const uniqueArtistIds = new Set(uniqueStats.map(l => l.track.release.user.id))

        // Get top artist for this listener
        const artistListenCounts = uniqueStats.reduce((acc, listen) => {
          const artistId = listen.track.release.user.id
          acc[artistId] = (acc[artistId] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const topArtistEntry = Object.entries(artistListenCounts)
          .sort(([,a], [,b]) => b - a)[0]

        let topArtist = null
        if (topArtistEntry) {
          const topArtistUser = uniqueStats.find(l => l.track.release.user.id === topArtistEntry[0])?.track.release.user
          topArtist = {
            username: topArtistUser!.username,
            name: topArtistUser!.name,
            listenCount: topArtistEntry[1]
          }
        }

        return {
          listener: {
            username: user!.username,
            name: user!.name
          },
          listenCount: stat._count.id,
          uniqueTracks: uniqueTrackIds.size,
          uniqueArtists: uniqueArtistIds.size,
          topArtist
        }
      })
    )

    // Get top artists
    const artistListens = await db.listen.findMany({
      where: {
        ...listenWhereCondition,
        userId: { not: null }
      },
      select: {
        userId: true,
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
          listens: [],
          uniqueListeners: new Set<string>()
        }
      }
      acc[artistId].listens.push(listen)
      acc[artistId].uniqueListeners.add(listen.userId)
      return acc
    }, {} as Record<string, { artist: unknown; listens: unknown[]; uniqueListeners: Set<string> }>)

    const artists = Object.values(artistGroups)
      .map((group: { artist: unknown; listens: unknown[]; uniqueListeners: Set<string> }) => {
        // Get top listener for this artist
        const listenerCounts = group.listens.reduce((acc: Record<string, { count: number; userId: string }>, listen: { userId: string }) => {
          if (!acc[listen.userId]) {
            acc[listen.userId] = { count: 0, userId: listen.userId }
          }
          acc[listen.userId].count++
          return acc
        }, {})

        const topListenerEntry = Object.values(listenerCounts)
          .sort((a: { count: number }, b: { count: number }) => b.count - a.count)[0] as { count: number; userId: string }

        let topListener = null
        if (topListenerEntry) {
          // Find the user details for the top listener
          const topListenerUser = listeners.find(() => 
            // We need to find the user ID from our listener stats
            listenerStats.find(ls => ls.userId === topListenerEntry.userId)
          )?.listener

          if (!topListenerUser) {
            // Fallback: fetch user from database
            const user = db.user.findUnique({
              where: { id: topListenerEntry.userId },
              select: { username: true, name: true }
            })
            if (user) {
              topListener = {
                username: (user as { username: string; name: string | null }).username,
                name: (user as { username: string; name: string | null }).name,
                listenCount: topListenerEntry.count
              }
            }
          } else {
            topListener = {
              username: topListenerUser.username,
              name: topListenerUser.name,
              listenCount: topListenerEntry.count
            }
          }
        }

        return {
          artist: group.artist,
          totalListens: group.listens.length,
          uniqueListeners: group.uniqueListeners.size,
          topListener
        }
      })
      .filter(artist => artist.totalListens >= minListens)
      .sort((a, b) => b.totalListens - a.totalListens)
      .slice(0, limit)

    // Get top tracks
    const trackStats = await db.listen.groupBy({
      by: ['trackId'],
      where: {
        ...listenWhereCondition,
        userId: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      having: {
        id: {
          _count: {
            gte: minListens
          }
        }
      },
      take: limit
    })

    const tracks = await Promise.all(
      trackStats.map(async (stat) => {
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

        // Get unique listeners for this track
        const uniqueListeners = await db.listen.findMany({
          where: {
            trackId: stat.trackId,
            userId: { not: null },
            ...(dateFilter && { listenedAt: { gte: dateFilter } })
          },
          select: {
            userId: true
          },
          distinct: ['userId']
        })

        return {
          track: {
            id: track!.id,
            title: track!.title,
            artist: track!.release.user,
            release: { title: track!.release.title }
          },
          listenCount: stat._count.id,
          uniqueListeners: uniqueListeners.length
        }
      })
    )

    // Get anonymous listening stats
    const anonymousListenCount = await db.listen.count({
      where: {
        ...listenWhereCondition,
        userId: null
      }
    })

    const totalListenCount = await db.listen.count({
      where: listenWhereCondition
    })

    const authenticatedListenCount = totalListenCount - anonymousListenCount

    // Get anonymous top tracks
    const anonymousTrackStats = await db.listen.groupBy({
      by: ['trackId'],
      where: {
        ...listenWhereCondition,
        userId: null
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      having: {
        id: {
          _count: {
            gte: minListens
          }
        }
      },
      take: limit
    })

    const anonymousTracks = await Promise.all(
      anonymousTrackStats.map(async (stat) => {
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

    return NextResponse.json({
      listeners,
      artists,
      tracks,
      anonymous: {
        totalListens: anonymousListenCount,
        topTracks: anonymousTracks
      },
      overview: {
        totalListens: totalListenCount,
        authenticatedListens: authenticatedListenCount,
        anonymousListens: anonymousListenCount,
        anonymousPercentage: totalListenCount > 0 ? Math.round((anonymousListenCount / totalListenCount) * 100) : 0
      },
      filters: {
        days,
        limit,
        minListens,
        artistFilter
      }
    })

  } catch (error) {
    console.error("Error fetching listening stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch listening stats" },
      { status: 500 }
    )
  }
}