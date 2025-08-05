import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { put } from "@vercel/blob"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions as Record<string, unknown>) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to upload songs" },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const tags = formData.get('tags') as string

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Song title is required" },
        { status: 400 }
      )
    }

    // Validate file type - be permissive for mobile audio but reject videos
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
      'audio/mp4a-latm', 'audio/x-caf', 'audio/quicktime',
      '', // Some mobile browsers report empty MIME type
    ]
    
    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac']
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma']
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv']
    
    // Reject obvious video files
    if (fileExt && videoExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: "Video files are not supported. Please upload an audio file." },
        { status: 400 }
      )
    }
    
    // Reject video MIME types (except video/mp4 which could be audio on iPhone)
    const videoMimeTypes = ['video/avi', 'video/mkv', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (videoMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Video files are not supported. Please upload an audio file." },
        { status: 400 }
      )
    }
    
    // Special case: video/mp4 is only allowed if extension suggests audio
    if (file.type === 'video/mp4' && fileExt && !['m4a', 'mp4'].includes(fileExt)) {
      return NextResponse.json(
        { error: "Video files are not supported. Please upload an audio file." },
        { status: 400 }
      )
    }
    
    // Accept if: valid audio MIME type OR valid audio extension OR starts with audio/
    const hasValidMimeType = allowedTypes.includes(file.type) || file.type.startsWith('audio/')
    const hasValidExtension = fileExt && allowedExtensions.includes(fileExt)
    const isEmptyTypeWithAudioExt = file.type === '' && fileExt && audioExtensions.includes(fileExt)
    
    const isValidType = hasValidMimeType || hasValidExtension || isEmptyTypeWithAudioExt
    
    if (!isValidType) {
      console.log(`File validation failed. Type: "${file.type}", Extension: "${fileExt}", Name: "${file.name}"`)
      return NextResponse.json(
        { error: `File type not supported. Detected: "${file.type}" with extension ".${fileExt}". Please upload an audio file (MP3, WAV, M4A, etc.).` },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedTitle = title.trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${session.user.id}-${timestamp}-${sanitizedTitle}.${fileExtension}`

    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    })

    // Save to database
    const song = await db.song.create({
      data: {
        title: title.trim(),
        fileName: file.name,
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type,
        userId: session.user.id,
      },
    })

    // Handle tags if provided
    if (tags?.trim()) {
      const tagNames = tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 10) // Limit to 10 tags

      for (const tagName of tagNames) {
        // Find or create tag
        let tag = await db.tag.findUnique({
          where: { name: tagName }
        })

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName }
          })
        }

        // Link song to tag
        await db.songTag.create({
          data: {
            songId: song.id,
            tagId: tag.id,
          },
        })
      }
    }

    return NextResponse.json(
      { 
        message: "Song uploaded successfully",
        songId: song.id,
        url: blob.url 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
