// api/blob/upload/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, _clientPayload) => {
        // Check authentication
        const session = await getServerSession(authOptions)
        if (!session?.user) {
          throw new Error("You must be logged in to upload files")
        }

        // You can add additional validation here based on pathname or clientPayload
        // For example, check file size limits, user quotas, etc.

        return {
          allowedContentTypes: [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac',
            'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/mp4',
            'audio/x-m4a', 'audio/mp4a-latm',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
          ],
          maximumSizeInBytes: 50 * 1024 * 1024 // 50MB limit
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload: _tokenPayload }) => {
        // Optional: Do something after upload completes
        // For example, log the upload, update database, etc.
        console.log('Upload completed:', blob.pathname)
      },
    })

    return Response.json(jsonResponse)
  } catch (error) {
    console.error('Blob upload error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
