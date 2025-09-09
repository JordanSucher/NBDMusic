"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import PlaylistView from "@/components/PlaylistView"

interface SharedTrack {
  id: string
  title: string
  trackNumber: number
  duration: number | null
  fileUrl: string
  lyrics: string | null
  addedAt: string
  position: number
  release: {
    id: string
    title: string
    releaseType: string
    artworkUrl: string | null
    releaseDate: string | null
  }
  artist: string
  listenCount: number
}

interface SharedPlaylistData {
  playlist: {
    id: string | null
    name: string
    description: string | null
    trackCount: number
    createdAt: string | null
    updatedAt: string | null
    owner: {
      username: string
      name: string | null
    }
    isOwner?: boolean
  }
  tracks: SharedTrack[]
}

export default function SharedPlaylistPage() {
  const params = useParams()
  const { data: session } = useSession()
  
  const [data, setData] = useState<SharedPlaylistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const playlistId = params?.playlistId as string

  const fetchSharedPlaylist = async () => {
    if (!playlistId) return

    try {
      const response = await fetch(`/api/playlists/${playlistId}/public`)
      if (response.ok) {
        const playlistData = await response.json()
        setData(playlistData)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load playlist")
      }
    } catch (error) {
      console.error("Error fetching shared playlist:", error)
      setError("Failed to load playlist")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSharedPlaylist()
  }, [playlistId, session]) // Add session to deps to refetch when login status changes

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center' }}>
        <h1>Loading...</h1>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container">
        <h1>Shared Playlist</h1>
        <div className="error">{error || "Playlist not found"}</div>
        <Link href="/" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          ← Go to Home
        </Link>
      </div>
    )
  }

  // Determine if user owns this playlist
  const isOwner = data.playlist.isOwner || false

  // Create share URL
  const shareUrl = `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${typeof window !== 'undefined' ? window.location.host : 'localhost'}/shared/playlist/${playlistId}`

  return (
    <PlaylistView
      data={data}
      isOwned={isOwner}
      onRefresh={fetchSharedPlaylist}
      showShareButton={isOwner}
      shareUrl={shareUrl}
    />
  )
}