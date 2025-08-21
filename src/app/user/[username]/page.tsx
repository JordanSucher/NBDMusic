"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import ReleaseCard from "@/components/ReleaseCard"
import FollowButton from "@/components/FollowButton"

interface Track {
  id: string
  title: string
  trackNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  duration: number | null
  mimeType: string
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

interface UserProfile {
  username: string
  releaseCount: number
  trackCount: number
  totalDuration: number
  joinedAt: string
  allTags: string[]
  releaseTypeCounts: {
    single: number
    ep: number
    album: number
    demo: number
  }
  followerCount?: number
  followingCount?: number
}

export default function PublicUserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [releases, setReleases] = useState<Release[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [localFollowerCount, setLocalFollowerCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`/api/user/profile/${encodeURIComponent(username)}`)
        if (response.ok) {
          const data = await response.json()
          setReleases(data.releases)
          setUserProfile(data.profile)
          setLocalFollowerCount(data.profile.followerCount || 0)
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleFollowChange = (isFollowing: boolean) => {
    // Update local follower count when follow status changes
    setLocalFollowerCount(prev => {
      if (prev === null) return null
      return isFollowing ? prev + 1 : prev - 1
    })
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

      {/* User Stats */}
      <div className="mb-20" style={{ 
        border: '2px solid #000', 
        padding: '10px', 
        backgroundColor: '#fff',
        marginBottom: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '10px'
        }}>
          <h2>About {userProfile.username}</h2>
          <FollowButton 
            username={userProfile.username} 
            onFollowChange={handleFollowChange}
          />
        </div>
        <div className="mb-10">
          <ul>
            <li>Releases shared: {userProfile.releaseCount}</li>
            <li>Total tracks: {userProfile.trackCount}</li>
            <li>
              Catalog: {userProfile.releaseTypeCounts.single} single{userProfile.releaseTypeCounts.single !== 1 ? 's' : ''}, {" "}
              {userProfile.releaseTypeCounts.ep} EP{userProfile.releaseTypeCounts.ep !== 1 ? 's' : ''}, {" "}
              {userProfile.releaseTypeCounts.album} album{userProfile.releaseTypeCounts.album !== 1 ? 's' : ''}, {" "}
              {userProfile.releaseTypeCounts.demo} demo{userProfile.releaseTypeCounts.demo !== 1 ? 's' : ''}
            </li>
            <li>Total duration: {formatDuration(userProfile.totalDuration)}</li>
            {(localFollowerCount !== null || userProfile.followingCount !== undefined) && (
              <li>
                {localFollowerCount !== null && `${localFollowerCount} follower${localFollowerCount !== 1 ? 's' : ''}`}
                {localFollowerCount !== null && userProfile.followingCount !== undefined && ' • '}
                {userProfile.followingCount !== undefined && `${userProfile.followingCount} following`}
              </li>
            )}
            <li>Genres/tags: {userProfile.allTags.length > 0 ? userProfile.allTags.join(', ') : 'None yet'}</li>
            <li>Member since: {new Date(userProfile.joinedAt).toLocaleDateString()}</li>
          </ul>
        </div>
      </div>

      {/* Releases List */}
      <div>
        <h2>{userProfile.username}&apos;s Releases ({releases.length})</h2>
        
        {releases.length === 0 ? (
          <div>
            <p>{userProfile.username} hasn&apos;t shared any releases yet.</p>
          </div>
        ) : (
          <div>
            {releases.map(release => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
