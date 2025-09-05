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

    // Fetch all releases with their tracks
    const releases = await db.release.findMany({
      select: {
        id: true,
        title: true,
        user: {
          select: {
            username: true
          }
        },
        tracks: {
          select: {
            id: true,
            title: true,
            trackNumber: true
          },
          orderBy: {
            trackNumber: 'asc'
          }
        }
      },
      where: {
        tracks: {
          some: {} // Only releases that have tracks
        }
      }
    })

    // Analyze each release for track numbering issues
    const issues = releases.filter(release => {
      const trackNumbers = release.tracks.map(t => t.trackNumber).sort((a, b) => a - b)
      const expectedNumbers = Array.from({ length: release.tracks.length }, (_, i) => i + 1)
      
      // Check if track numbers are sequential starting from 1
      const isSequential = trackNumbers.length === expectedNumbers.length &&
        trackNumbers.every((num, index) => num === expectedNumbers[index])
      
      return !isSequential
    }).map(release => {
      const actualNumbers = release.tracks.map(t => t.trackNumber).sort((a, b) => a - b)
      const expectedNumbers = Array.from({ length: release.tracks.length }, (_, i) => i + 1)
      
      // Find missing numbers (should be 1,2,3... but some are missing)
      const missingNumbers = expectedNumbers.filter(num => !actualNumbers.includes(num))
      
      // Find duplicate numbers
      const duplicateNumbers = actualNumbers.filter((num, index) => actualNumbers.indexOf(num) !== index)
      const uniqueDuplicates = [...new Set(duplicateNumbers)]
      
      return {
        release,
        expectedNumbers,
        actualNumbers,
        missingNumbers,
        duplicateNumbers: uniqueDuplicates
      }
    })

    return NextResponse.json({
      issues,
      total: releases.length,
      problemCount: issues.length
    })

  } catch (error) {
    console.error("Error scanning for track number issues:", error)
    return NextResponse.json(
      { error: "Failed to scan for track number issues" },
      { status: 500 }
    )
  }
}