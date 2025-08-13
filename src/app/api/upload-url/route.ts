// api/upload-url/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { handleUpload } from "@vercel/blob/client"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Check authentication  
    const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to upload files" },
        { status: 401 }
      )
    }

    const { filename, contentType, fileType, fileSize } = await request.json()

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and content type are required" },
        { status: 400 }
      )
    }

    // Validate file types
    const allowedAudioTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 
      'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/mp4',
      'audio/x-m4a', 'audio/mp4a-latm'
    ]
    const allowedImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ]

    if (fileType === 'track' && !allowedAudioTypes.includes(contentType) && !contentType.startsWith('audio/')) {
      return NextResponse.json(
        { error: "Invalid audio file type" },
        { status: 400 }
      )
    }

    if (fileType === 'artwork' && !allowedImageTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid image file type" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const folder = fileType === 'artwork' ? 'artwork' : 'tracks'
    const uniqueFilename = `${folder}/${timestamp}-${filename}`

    // Return the info needed for client-side upload
    return NextResponse.json({
      pathname: uniqueFilename,
      contentType,
      fileSize
    })

  } catch (error) {
    console.error("Upload URL generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    )
  }
}
