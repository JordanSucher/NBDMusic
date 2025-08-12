"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import ReleaseCard from "@/components/ReleaseCard"

interface Release {
  id: string
  title: string
  description: string | null
  releaseType: string
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
  tracks: {
    id: string
    title: string
    trackNumber: number
    fileName: string
    fileUrl: string
    fileSize: number
    duration: number | null
    mimeType: string
  }[]
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [followStats, setFollowStats] = useState<{
    followerCount: number
    followingCount: number
    recentFollowers: Array<{ username: string, name: string | null }>
  } | null>(null)

  useEffect(() => {
    if (session) {
      fetchUserReleases()
      fetchFollowStats()
    } else if (status !== "loading") {
      setLoading(false)
    }
  }, [session, status])

  const fetchUserReleases = async () => {
    try {
      const response = await fetch('/api/user/releases')
      if (response.ok) {
        const data = await response.json()
        setReleases(data.releases)
      } else {
        setError("Failed to load your releases")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const fetchFollowStats = async () => {
    try {
      const response = await fetch('/api/user/stats')
      if (response.ok) {
        const data = await response.json()
        setFollowStats(data)
      }
    } catch (error) {
      console.error("Failed to load follow stats:", error)
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

  if (!session?.user) {
    return (
      <div className="container">
        <h1>My Profile</h1>
        <p>You need to be logged in to view your profile.</p>
        <p><Link href="/login">Login here</Link></p>
      </div>
    )
  }

  // Note: Tag editing would need to be added to ReleaseCard component
  // or implemented as a separate component/modal

  const handleDeleteRelease = async (releaseId: string) => {
    if (!confirm("Are you sure you want to delete this release? This will delete all tracks and cannot be undone.")) {
      return
    }

    setDeletingId(releaseId)
    
    try {
      const response = await fetch(`/api/releases/${releaseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove release from local state
        setReleases(releases.filter(release => release.id !== releaseId))
      } else {
        const data = await response.json()
        setError(data.error || "Failed to delete release")
      }
    } catch {
      setError("Something went wrong while deleting")
    } finally {
      setDeletingId(null)
    }
  }

  const getTotalFileSize = () => {
    return releases.reduce((total, release) => {
      return total + release.tracks.reduce((releaseTotal, track) => releaseTotal + track.fileSize, 0)
    }, 0)
  }

  const getTotalTracks = () => {
    return releases.reduce((total, release) => total + release.tracks.length, 0)
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
    releases.forEach(release => {
      release.tags.forEach(releaseTag => {
        tagSet.add(releaseTag.tag.name)
      })
    })
    return Array.from(tagSet).sort()
  }

  const getReleaseTypeCounts = () => {
    const counts = { single: 0, ep: 0, album: 0, demo: 0 }
    releases.forEach(release => {
      const type = release.releaseType as keyof typeof counts
      if (type in counts) {
        counts[type]++
      }
    })
    return counts
  }

  if (loading) {
    return (
      <div className="container">
        <h1>My Profile</h1>
        <p>Loading your releases...</p>
      </div>
    )
  }

  const releaseTypeCounts = getReleaseTypeCounts()

  return (
    <div className="container">
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
            <li>Releases: {releases.length}</li>
            <li>Total tracks: {getTotalTracks()}</li>
            <li>Singles: {releaseTypeCounts.single} | EPs: {releaseTypeCounts.ep} | Albums: {releaseTypeCounts.album} | Demos: {releaseTypeCounts.demo}</li>
            <li>Total storage used: {formatFileSize(getTotalFileSize())}</li>
            {followStats && (
              <li>
                <Link href="/followers" style={{ color: '#0000ff', textDecoration: 'underline' }}>
                  {followStats.followerCount} follower{followStats.followerCount !== 1 ? 's' : ''}
                </Link>
                {' • '}
                <Link href="/following" style={{ color: '#0000ff', textDecoration: 'underline' }}>
                  {followStats.followingCount} following
                </Link>
              </li>
            )}
            <li>Tags you&apos;ve used: {getAllTags().length > 0 ? getAllTags().join(', ') : 'None yet'}</li>
            <li>Member since: {(session.user as { createdAt?: string }).createdAt ? new Date((session.user as { createdAt?: string }).createdAt!).toLocaleDateString() : 'Recently'}</li>
          </ul>
          
          {followStats && followStats.recentFollowers.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Recent followers:</strong>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {followStats.recentFollowers.slice(0, 5).map((follower, index) => (
                  <span key={follower.username}>
                    <Link href={`/user/${encodeURIComponent(follower.username)}`} style={{ color: '#0000ff' }}>
                      {follower.name || follower.username}
                    </Link>
                    {index < Math.min(followStats.recentFollowers.length, 5) - 1 && ', '}
                  </span>
                ))}
                {followStats.recentFollowers.length > 5 && (
                  <span> and {followStats.recentFollowers.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && <div className="error">{error}</div>}

      {/* Releases List */}
      <div>
        <h2>Your Releases ({releases.length})</h2>
        
        {releases.length === 0 ? (
          <div>
            <p>You haven&apos;t uploaded any releases yet.</p>
            <p><Link href="/upload">Upload your first release!</Link></p>
          </div>
        ) : (
          <div>
            {releases.map(release => (
              <ReleaseCard 
                key={release.id}
                release={release}
                onDelete={handleDeleteRelease}
                isDeleting={deletingId === release.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {releases.length > 0 && (
        <div className="mb-20">
          <h3>Quick Actions</h3>
          <ul>
            <li><Link href="/upload">Upload another release</Link></li>
            <li><Link href="/browse">See how your releases look to others</Link></li>
            <li>Share your profile: <Link href={`/user/${encodeURIComponent(session.user.name || session.user.email || '')}`}>
              /user/{session.user.name || session.user.email}
            </Link></li>
          </ul>
        </div>
      )}
    </div>
  )
}
