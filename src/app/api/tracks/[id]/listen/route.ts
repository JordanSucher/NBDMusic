import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await context.params
    
    // Get session (optional - anonymous listens are allowed)
    const session = await getServerSession(authOptions)
    let userId = null
    
    if (session?.user?.email) {
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      userId = user?.id || null
    }
    
    // Get client IP and user agent for analytics/abuse prevention
    const forwarded = request.headers.get("x-forwarded-for")
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : 
                     request.headers.get("x-real-ip") || 
                     "unknown"
    const userAgent = request.headers.get("user-agent") || null
    
    // Verify track exists
    const track = await db.track.findUnique({
      where: { id: trackId },
      select: { id: true, title: true }
    })
    
    if (!track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      )
    }
    
    // Check for recent duplicate listens from same source to prevent spam
    // Only count as a new listen if it's been more than 30 seconds since last listen
    // from same IP (for anonymous) or user (for authenticated)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)
    
    let existingRecentListen
    if (userId) {
      // For authenticated users, check by user ID
      existingRecentListen = await db.listen.findFirst({
        where: {
          trackId,
          userId,
          listenedAt: { gte: thirtySecondsAgo }
        }
      })
    } else {
      // For anonymous users, check by IP address
      existingRecentListen = await db.listen.findFirst({
        where: {
          trackId,
          userId: null,
          ipAddress,
          listenedAt: { gte: thirtySecondsAgo }
        }
      })
    }
    
    if (existingRecentListen) {
      // Don't record duplicate listen, but return success
      return NextResponse.json({
        message: "Listen already recorded recently",
        duplicate: true
      })
    }
    
    // Record the listen
    const listen = await db.listen.create({
      data: {
        trackId,
        userId,
        ipAddress: ipAddress.substring(0, 45), // Limit IP address length
        userAgent: userAgent?.substring(0, 500) || null // Limit user agent length
      }
    })
    
    return NextResponse.json({
      message: "Listen recorded successfully",
      listenId: listen.id,
      duplicate: false
    })
    
  } catch (error) {
    console.error("Error recording listen:", error)
    return NextResponse.json(
      { error: "Failed to record listen" },
      { status: 500 }
    )
  }
}