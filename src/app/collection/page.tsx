"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface PlaylistSummary {
  id: string | null
  name: string
  description: string | null
  trackCount: number
  createdAt: string | null
  updatedAt: string | null
  isSystem: boolean
}

export default function CollectionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Fetch playlists
  useEffect(() => {
    if (!session?.user) return

    const fetchPlaylists = async () => {
      try {
        // For now, just fetch liked songs
        const response = await fetch("/api/playlists/liked-songs")
        if (response.ok) {
          const likedSongsData = await response.json()
          setPlaylists([{
            ...likedSongsData.playlist,
            isSystem: true
          }])
        } else {
          const errorData = await response.json()
          setError(errorData.error || "Failed to load playlists")
        }
      } catch (error) {
        console.error("Error fetching playlists:", error)
        setError("Failed to load playlists")
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [session])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not created yet"
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getPlaylistIcon = (playlist: PlaylistSummary) => {
    if (playlist.name === "Liked Songs") return "♥"
    return "📄" // Default playlist icon for future playlists
  }

  const getPlaylistUrl = (playlist: PlaylistSummary) => {
    if (playlist.name === "Liked Songs") return "/collection/liked-songs"
    return `/collection/${playlist.id}` // For future playlists
  }

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

  if (error) {
    return (
      <div className="container">
        <h1>Collections</h1>
        <div className="error">{error}</div>
        <Link href="/">← Back to Home</Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '30px' }}>
        <h1>Your Collection</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Your playlists and saved music collection.
        </p>
      </div>

      {playlists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h2>No collection yet</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Start liking songs to build your first collection!
          </p>
          <Link 
            href="/browse"
            style={{
              color: '#0066cc',
              textDecoration: 'underline',
              fontWeight: 'bold'
            }}
          >
            Browse Music →
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {playlists.map((playlist) => (
            <Link 
              key={playlist.name}
              href={getPlaylistUrl(playlist)}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  border: '2px solid #ddd',
                  padding: '20px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Courier New, monospace'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0066cc'
                  e.currentTarget.style.backgroundColor = '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ddd'
                  e.currentTarget.style.backgroundColor = '#fff'
                }}
              >
                {/* Playlist Icon and Title */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <span style={{ 
                    fontSize: '16px',
                    position: 'relative',
                    top: '-5px'
                  }}>
                    {getPlaylistIcon(playlist)}
                  </span>
                  <h3 style={{ 
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    lineHeight: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {playlist.name}
                  </h3>
                </div>

                {/* Stats */}
                <div style={{
                  fontSize: '12px',
                  color: '#888'
                }}>
                  <div>{playlist.trackCount} song{playlist.trackCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Future: Add playlist button */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        textAlign: 'center',
        border: '2px dashed #ccc',
        color: '#666',
        fontStyle: 'italic'
      }}>
        Custom playlists coming soon...
      </div>
    </div>
  )
}