import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')
    const followingOnly = searchParams.get('following') === 'true'
    const searchTerm = searchParams.get('search')
    const tagParam = searchParams.get('tag')
    
    const limit = limitParam ? parseInt(limitParam, 10) : 10 // Default to 10 items per page (reduced for testing)
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1
    const skip = (page - 1) * limit

    let whereCondition: any = {
      AND: [
        // Base condition for published releases
        {
          OR: [
            { releaseDate: null }, // Include releases without a release date
            { releaseDate: { lte: new Date() } }
          ]
        }
      ]
    }

    // If following filter is requested, get user's following list
    if (followingOnly) {
      const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "You must be logged in to filter by following" },
          { status: 401 }
        )
      }

      // Get list of users the current user follows
      const following = await db.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true }
      })

      const followingUserIds = following.map(f => f.followingId)

      // If user doesn't follow anyone, return empty results
      if (followingUserIds.length === 0) {
        return NextResponse.json({ 
          releases: [], 
          pagination: {
            page: 1,
            limit,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        })
      }

      whereCondition.AND.push({
        userId: {
          in: followingUserIds
        }
      })
    }

    // Add search filtering
    if (searchTerm && searchTerm.trim()) {
      const searchTermLower = searchTerm.trim()
      whereCondition.AND.push({
        OR: [
          {
            title: {
              contains: searchTermLower,
              mode: 'insensitive'
            }
          },
          {
            user: {
              username: {
                contains: searchTermLower,
                mode: 'insensitive'
              }
            }
          },
          {
            tracks: {
              some: {
                title: {
                  contains: searchTermLower,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      })
    }

    // Add tag filtering
    if (tagParam && tagParam.trim()) {
      whereCondition.AND.push({
        tags: {
          some: {
            tag: {
              name: tagParam.trim()
            }
          }
        }
      })
    }

    // Get total count for pagination
    const totalCount = await db.release.count({
      where: whereCondition
    })

    const releases = await db.release.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            username: true
          }
        },
        tags: {
          include: {
            tag: true
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
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      take: limit,
      skip: skip
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      releases,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error("Error fetching releases:", error)
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    )
  }
}
