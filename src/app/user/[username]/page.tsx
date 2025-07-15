"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
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

interface UserProfile {
  username: string
  songCount: number
  totalFileSize: number
  joinedAt: string
  allTags: string[]
}

export default function PublicUserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [songs, setSongs] = useState<Song[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/user/profile/${encodeURIComponent(username)}`)
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
        setUserProfile(data.profile)
      } else if (response.status === 404) {
        setError("User not found")
      } else {
        setError("Failed to load user profile")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }
  
    if (username) {
      fetchUserProfile()
    }
  }, [username])

  

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="container">
        <h1>User Profile</h1>
        <p>Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <h1>User Profile</h1>
        <div className="error">{error}</div>
        <p><Link href="/browse">← Back to browse</Link></p>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="container">
        <h1>User Profile</h1>
        <p>User not found.</p>
        <p><Link href="/browse">← Back to browse</Link></p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>{userProfile.username}&apos;s Profile</h1>
      
      <nav>
        <Link href="/browse">← Back to browse</Link>
        <Link href="/">Home</Link>
      </nav>

      {/* User Stats */}
      <div className="mb-20" style={{ 
        border: '2px solid #000', 
        padding: '10px', 
        backgroundColor: '#fff',
        marginBottom: '20px'
      }}>
        <h2>About {userProfile.username}</h2>
        <div className="mb-10">
          <ul>
            <li>Songs shared: {userProfile.songCount}</li>
            <li>Total content: {formatFileSize(userProfile.totalFileSize)}</li>
            <li>Genres/tags: {userProfile.allTags.length > 0 ? userProfile.allTags.join(', ') : 'None yet'}</li>
            <li>Member since: {new Date(userProfile.joinedAt).toLocaleDateString()}</li>
          </ul>
        </div>
      </div>

      {/* Songs List */}
      <div>
        <h2>{userProfile.username}&apos;s Songs ({songs.length})</h2>
        
        {songs.length === 0 ? (
          <div>
            <p>{userProfile.username} hasn&apos;t shared any songs yet.</p>
          </div>
        ) : (
          <div>
            {songs.map(song => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </div>

      {/* Discovery */}
      {songs.length > 0 && (
        <div className="mb-20">
          <h3>Discover More</h3>
          <ul>
            <li><Link href="/browse">Browse all songs</Link></li>
            {userProfile.allTags.length > 0 && (
              <li>
                Similar artists with tags: {" "}
                {userProfile.allTags.slice(0, 3).map((tag, index) => (
                  <span key={tag}>
                    <Link href={`/browse?tag=${encodeURIComponent(tag)}`}>
                      {tag}
                    </Link>
                    {index < userProfile.allTags.slice(0, 3).length - 1 && ", "}
                  </span>
                ))}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
