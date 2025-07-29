"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
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

export default function HomePage() {
  const { data: session, status } = useSession()
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentSongs()
  }, [])

  const fetchRecentSongs = async () => {
    try {
      const response = await fetch('/api/songs?limit=5')
      if (response.ok) {
        const data = await response.json()
        setRecentSongs(data.songs || [])
      }
    } catch (error) {
      console.error("Failed to fetch recent songs:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="container">
        <h1>Early Bird</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>nbd</h1>
        <p>a simple platform for musicians to share demos, works in progress, and more</p>
      </header>

      <nav>
        {session?.user ? (
          <>
            <Link href="/upload">Upload Song</Link>
            <Link href="/browse">Browse Songs</Link>
            <Link href="/profile">My Profile</Link>
            <button onClick={() => signOut()}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
            <Link href="/browse">Browse Songs</Link>
          </>
        )}
      </nav>

      <main>
        {session?.user ? (
          <div>
            <h2>Welcome back, {session.user.name || session.user.email}!</h2>
            <p>What would you like to do today?</p>
            
            <div className="mb-20">
              <h3>Quick Actions:</h3>
              <ul>
                <li><Link href="/upload">Upload</Link></li>
                <li><Link href="/browse">Discover</Link></li>
                <li><Link href="/profile">Manage</Link></li>
              </ul>
            </div>
          </div>
        ) : (<></>)}

        {/* Recently Uploaded Songs */}
        <div className="mb-20">
          <h2>Recent Uploads</h2>
          
          {loading ? (
            <p>Loading recent songs...</p>
          ) : recentSongs.length > 0 ? (
            <div>
              <p>Check out what folks have been sharing:</p>
              {recentSongs.map(song => (
                <SongCard key={song.id} song={song} />
              ))}
              <p>
                <Link href="/browse">View all songs →</Link>
              </p>
            </div>
          ) : (
            <div>
              <p>No songs uploaded yet.</p>
              {session?.user ? (
                <p><Link href="/upload">Be the first to upload a song!</Link></p>
              ) : (
                <p><Link href="/register">Create an account</Link> and be the first to share your music!</p>
              )}
            </div>
          )}
        </div>
      </main>

      <footer style={{ marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        <p>no big deal.</p>
      </footer>
    </div>
  )
}
