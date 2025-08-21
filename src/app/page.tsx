"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import ReleaseCard from "@/components/ReleaseCard"

interface Track {
  id: string
  title: string
  trackNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  duration: number | null
  mimeType: string
  lyrics: string | null
  _count: {
    listens: number
  }
}

interface Release {
  id: string
  title: string
  description: string | null
  releaseType: string
  releaseDate: string | null
  artworkUrl: string | null
  uploadedAt: string
  user: {
    username: string
  }
  tags: {
    tag: {
      name: string
    }
  }[]
  tracks: Track[]
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [recentReleases, setRecentReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentReleases()
  }, [])

  const fetchRecentReleases = async () => {
    try {
      const response = await fetch('/api/releases?limit=5')
      if (response.ok) {
        const data = await response.json()
        setRecentReleases(data.releases || [])
      }
    } catch (error) {
      console.error("Failed to fetch recent releases:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="container">
        <h1>nbd</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <main>
        {session?.user ? (
          <div>
            <h2>Welcome back, {session.user.name || session.user.email}!</h2>
            <p>What would you like to do today?</p>
            
            <div className="mb-20">
              <h3>Quick Actions:</h3>
              <ul>
                <li><Link href="/upload">Upload a new release</Link></li>
                <li><Link href="/browse">Discover new music</Link></li>
                <li><Link href="/profile">Manage your releases</Link></li>
              </ul>
            </div>
          </div>
        ) : (<></>)}

        {/* Recently Uploaded Releases */}
        <div className="mb-20">
          <h2>Recent Uploads</h2>
          
          {loading ? (
            <p>Loading recent releases...</p>
          ) : recentReleases.length > 0 ? (
            <div>
              <p>Check out what others have been sharing:</p>
              {recentReleases.map(release => (
                <ReleaseCard key={release.id} release={release} />
              ))}
              <p>
                <Link href="/browse">View all releases →</Link>
              </p>
            </div>
          ) : (
            <div>
              <p>No music uploaded yet.</p>
              {session?.user ? (
                <p><Link href="/upload">Be the first to upload a release!</Link></p>
              ) : (
                <p><Link href="/register">Create an account</Link> and be the first to share your music!</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
