"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import PlaylistView from "@/components/PlaylistView"

interface LikedTrack {
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

interface LikedSongsData {
  playlist: {
    id: string | null
    name: string
    description: string | null
    trackCount: number
    createdAt: string | null
    updatedAt: string | null
  }
  tracks: LikedTrack[]
}

export default function LikedSongsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [data, setData] = useState<LikedSongsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [shareUrl, setShareUrl] = useState<string>('')

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchLikedSongs = async () => {
    if (!session?.user) return

    try {
      const response = await fetch("/api/playlists/liked-songs")
      if (response.ok) {
        const likedSongsData = await response.json()
        setData(likedSongsData)
        
        // Set share URL
        if (likedSongsData.playlist.id) {
          setShareUrl(`${window.location.protocol}//${window.location.host}/shared/playlist/${likedSongsData.playlist.id}`)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load liked songs")
      }
    } catch (error) {
      console.error("Error fetching liked songs:", error)
      setError("Failed to load liked songs")
    } finally {
      setLoading(false)
    }
  }

  // Fetch liked songs
  useEffect(() => {
    fetchLikedSongs()
  }, [session])

  if (status === "loading" || loading) {
    return (
      <div className="container" style={{ textAlign: 'center' }}>
        <h1>Loading...</h1>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null // Will redirect
  }

  if (error || !data) {
    return (
      <div className="container">
        <div style={{ marginBottom: '20px' }}>
          <Link href="/collection" style={{ color: '#0066cc', textDecoration: 'underline' }}>
            ← Back to Collection
          </Link>
        </div>
        <h1>♥ Liked Songs</h1>
        <div className="error">{error || "Failed to load playlist"}</div>
      </div>
    )
  }

  return (
    <PlaylistView
      data={data}
      isOwned={true}
      onRefresh={fetchLikedSongs}
      showShareButton={true}
      shareUrl={shareUrl}
    />
  )
}