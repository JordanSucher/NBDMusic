"use client"

import { useState, useEffect, useCallback } from "react"
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

  const fetchLikedSongs = useCallback(async () => {
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
  }, [session])

  // Fetch liked songs
  useEffect(() => {
    fetchLikedSongs()
  }, [fetchLikedSongs])

  if (status === "loading" || loading) {
    return (
      <>
        {/* Desktop Mac window */}
        <div className="desktop-loading" style={{ background: '#f8f8f8 !important', paddingTop: '80px' }}>
          <div style={{ 
            background: 'linear-gradient(145deg, #f0f0f0 0%, #d0d0d0 50%, #b8b8b8 100%)',
            border: '1px solid #000',
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '0',
            overflow: 'visible'
          }}>
            {/* Brushed steel window title bar */}
            <div style={{
              background: 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)',
              borderBottom: '1px solid #000',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold'
            }}>
              <span>♥ Liked Songs</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{
                  width: '14px',
                  height: '12px',
                  background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)',
                  border: '2px outset #d0d0d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '7px',
                  cursor: 'pointer'
                }}>-</div>
                <div style={{
                  width: '14px',
                  height: '12px',
                  background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)',
                  border: '2px outset #d0d0d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  cursor: 'pointer'
                }}>□</div>
              </div>
            </div>

            {/* Window content */}
            <div style={{ backgroundColor: 'white', padding: '12px', overflow: 'visible' }}>
              {/* Playlist Header */}
              <div style={{ 
                display: 'flex', 
                gap: '20px', 
                marginBottom: '30px',
                alignItems: 'flex-start'
              }}>
                {/* Artwork placeholder */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    animation: 'pulse 1.5s ease-in-out infinite alternate'
                  }}>
                    ♡
                  </div>
                </div>

                {/* Playlist Info placeholder */}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '15px'
                  }}>
                    Loading...
                  </div>
                </div>
              </div>

              {/* Loading message */}
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '16px', color: '#666' }}>Loading your liked songs...</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile simple loading */}
        <div className="mobile-loading" style={{ 
          padding: '80px 20px 40px 20px'
        }}>
          <h1>♥ Liked Songs</h1>
          <div style={{ 
            textAlign: 'center',
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              fontSize: '72px',
              animation: 'pulse 1.5s ease-in-out infinite alternate',
              color: '#666'
            }}>
              ♡
            </div>
            <div style={{ fontSize: '18px', color: '#666' }}>
              Loading your liked songs...
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0% { opacity: 0.6; }
            100% { opacity: 1; }
          }
          
          .mobile-loading {
            display: none;
          }
          
          @media (max-width: 768px) {
            .desktop-loading {
              display: none;
            }
            
            .mobile-loading {
              display: block;
            }
          }
        `}</style>
      </>
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