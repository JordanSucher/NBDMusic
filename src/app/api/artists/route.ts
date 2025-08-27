import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// Define the where condition type
interface WhereCondition {
  releases: {
    some: {
      OR: Array<{
        releaseDate?: null | { lte: Date }
      }>
    }
  }
  username?: {
    contains: string
    mode: 'insensitive'
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')
    const searchTerm = searchParams.get('search')
    const sortMode = searchParams.get('sort') || 'latest'
    
    const limit = limitParam ? parseInt(limitParam, 10) : 10 // Default to 10 items per page
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1
    const skip = (page - 1) * limit

    // Build where condition for filtering users with releases
    const whereCondition: WhereCondition = {
      releases: {
        some: {
          OR: [
            { releaseDate: null }, // Include releases without a release date
            { releaseDate: { lte: new Date() } }
          ]
        }
      }
    }

    // Add search filtering if provided
    if (searchTerm && searchTerm.trim()) {
      whereCondition.username = {
        contains: searchTerm.trim(),
        mode: 'insensitive'
      }
    }

    // Get total count for pagination
    const totalCount = await db.user.count({
      where: whereCondition
    })

    // Fetch artists (users with releases) with aggregated data
    const artists = await db.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        username: true,
        name: true,
        releases: {
          where: {
            OR: [
              { releaseDate: null },
              { releaseDate: { lte: new Date() } }
            ]
          },
          select: {
            id: true,
            title: true,
            releaseType: true,
            artworkUrl: true,
            uploadedAt: true,
            releaseDate: true,
            tracks: {
              select: {
                id: true,
                _count: {
                  select: {
                    listens: true
                  }
                }
              }
            }
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        },
        _count: {
          select: {
            releases: {
              where: {
                OR: [
                  { releaseDate: null },
                  { releaseDate: { lte: new Date() } }
                ]
              }
            },
            followers: true
          }
        }
      },
      orderBy: {
        username: 'asc'
      },
      take: limit,
      skip: skip
    })

    // Calculate total tracks for each artist and sort by latest release date
    const artistsWithStats = artists.map(artist => {
      const totalTracks = artist.releases.reduce((total, release) => {
        return total + release.tracks.length
      }, 0)

      const latestRelease = artist.releases.length > 0 ? artist.releases[0] : null

      return {
        id: artist.id,
        username: artist.username,
        name: artist.name,
        releaseCount: artist._count.releases,
        followerCount: artist._count.followers,
        totalTracks,
        latestRelease: latestRelease ? {
          id: latestRelease.id,
          title: latestRelease.title,
          releaseType: latestRelease.releaseType,
          artworkUrl: latestRelease.artworkUrl,
          uploadedAt: latestRelease.uploadedAt,
          releaseDate: latestRelease.releaseDate
        } : null,
        // Add sorting key - use release date if available, otherwise upload date
        latestReleaseSort: latestRelease ? 
          new Date(latestRelease.releaseDate || latestRelease.uploadedAt) : 
          new Date(0) // Very old date for artists with no releases
      }
    })

    // Sort based on the requested sort mode
    if (sortMode === 'alphabetical') {
      artistsWithStats.sort((a, b) => {
        const nameA = a.name || a.username
        const nameB = b.name || b.username
        return nameA.toLowerCase().localeCompare(nameB.toLowerCase())
      })
    } else {
      // Default: sort by latest release date (most recent first)
      artistsWithStats.sort((a, b) => {
        return b.latestReleaseSort.getTime() - a.latestReleaseSort.getTime()
      })
    }

    // Remove the sorting key from the response
    const sortedArtists = artistsWithStats.map(artist => {
      const { latestReleaseSort, ...artistWithoutSort } = artist
      return artistWithoutSort
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      artists: sortedArtists,
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
    console.error("Error fetching artists:", error)
    return NextResponse.json(
      { error: "Failed to fetch artists" },
      { status: 500 }
    )
  }
}
