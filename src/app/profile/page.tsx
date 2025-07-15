"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import SongCard from "@/components/SongCard"

interface Song {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileSize: number
  uploadedAt: string
  user: {
    username: string
  }
  tags: {
    tag: {
      name: string
    }
  }[]
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchUserSongs()
    } else if (status !== "loading") {
      setLoading(false)
    }
  }, [session, status])

  const fetchUserSongs = async () => {
    try {
      const response = await fetch('/api/user/songs')
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
      } else {
        setError("Failed to load your songs")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // Redirect if not logged in
  if (status === "loading") {
    return (
      <div className="container">
        <h1>My Profile</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container">
        <h1>My Profile</h1>
        <p>You need to be logged in to view your profile.</p>
        <p><Link href="/login">Login here</Link></p>
      </div>
    )
  }

  const handleTagsUpdated = (songId: string, newTags: string[]) => {
    setSongs(songs.map(song => {
      if (song.id === songId) {
        return {
          ...song,
          tags: newTags.map(tagName => ({
            tag: { name: tagName }
          }))
        }
      }
      return song
    }))
  }

  const handleDeleteSong = async (songId: string) => {
    if (!confirm("Are you sure you want to delete this song? This cannot be undone.")) {
      return
    }

    setDeletingId(songId)
    
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove song from local state
        setSongs(songs.filter(song => song.id !== songId))
      } else {
        const data = await response.json()
        setError(data.error || "Failed to delete song")
      }
    } catch {
      setError("Something went wrong while deleting")
    } finally {
      setDeletingId(null)
    }
  }

  const getTotalFileSize = () => {
    return songs.reduce((total, song) => total + song.fileSize, 0)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getAllTags = () => {
    const tagSet = new Set<string>()
    songs.forEach(song => {
      song.tags.forEach(songTag => {
        tagSet.add(songTag.tag.name)
      })
    })
    return Array.from(tagSet).sort()
  }

  if (loading) {
    return (
      <div className="container">
        <h1>My Profile</h1>
        <p>Loading your songs...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>My Profile</h1>
      
      <nav>
        <Link href="/">← Back to home</Link>
        <Link href="/upload">Upload new song</Link>
        <Link href="/browse">Browse all songs</Link>
      </nav>

      {/* User Stats */}
      <div className="mb-20" style={{ 
        border: '2px solid #000', 
        padding: '10px', 
        backgroundColor: '#fff',
        marginBottom: '20px'
      }}>
        <h2>Hello, {session.user.name || session.user.email}!</h2>
        <div className="mb-10">
          <strong>Your Stats:</strong>
          <ul>
            <li>Songs uploaded: {songs.length}</li>
            <li>Total storage used: {formatFileSize(getTotalFileSize())}</li>
            <li>Tags you&apos;ve used: {getAllTags().length > 0 ? getAllTags().join(', ') : 'None yet'}</li>
            <li>Member since: {new Date(session.user.id).toLocaleDateString()}</li>
          </ul>
        </div>
      </div>

      {/* Error Display */}
      {error && <div className="error">{error}</div>}

      {/* Songs List */}
      <div>
        <h2>Your Songs ({songs.length})</h2>
        
        {songs.length === 0 ? (
          <div>
            <p>You haven&apos;t uploaded any songs yet.</p>
            <p><Link href="/upload">Upload your first song!</Link></p>
          </div>
        ) : (
          <div>
            {songs.map(song => (
              <div key={song.id} style={{ position: 'relative' }}>
                <SongCard 
                  song={song} 
                  showTagEditor={true}
                  onTagsUpdated={handleTagsUpdated}
                />
                
                {/* Delete Button */}
                <div style={{ 
                  textAlign: 'right', 
                  marginTop: '5px', 
                  marginBottom: '10px',
                  paddingRight: '10px'
                }}>
                  <button
                    onClick={() => handleDeleteSong(song.id)}
                    disabled={deletingId === song.id}
                    style={{
                      backgroundColor: '#ff4444',
                      color: 'white',
                      fontSize: '12px',
                      padding: '2px 6px'
                    }}
                  >
                    {deletingId === song.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {songs.length > 0 && (
        <div className="mb-20">
          <h3>Quick Actions</h3>
          <ul>
            <li><Link href="/upload">Upload another song</Link></li>
            <li><Link href="/browse">See how your songs look to others</Link></li>
            <li>Share your profile: <Link href={`/user/${encodeURIComponent(session.user.name || session.user.email || '')}`}>
              /user/{session.user.name || session.user.email}
            </Link></li>
          </ul>
        </div>
      )}
    </div>
  )
}
