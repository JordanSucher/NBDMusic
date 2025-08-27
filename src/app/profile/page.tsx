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
  tracks: {
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
  }[]
}

interface UserProfile {
  id: string
  username: string
  name: string | null
  bio: string | null
  url: string | null
  email: string
  createdAt: string
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: "",
    bio: "",
    url: ""
  })
  const [profileSaveLoading, setProfileSaveLoading] = useState(false)
  const [profileUrlError, setProfileUrlError] = useState("")

  useEffect(() => {
    if (session) {
      fetchUserReleases()
      fetchFollowStats()
      fetchUserProfile()
    } else if (status !== "loading") {
      setLoading(false)
    }
  }, [session, status])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
        setProfileForm({
          name: data.user.name || "",
          bio: data.user.bio || "",
          url: data.user.url || ""
        })
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
    }
  }

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

  const getTotalDuration = () => {
    return releases.reduce((total, release) => {
      return total + release.tracks.reduce((releaseTotal, track) => releaseTotal + (track.duration || 0), 0)
    }, 0)
  }

  const getTotalTracks = () => {
    return releases.reduce((total, release) => total + release.tracks.length, 0)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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

  const validateUrl = (url: string) => {
    if (!url.trim()) return true // Empty URL is valid
    
    // Check for common URL patterns
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i
    const commonDomains = /\.(com|org|net|edu|gov|io|co|me|app|dev|tech|music|band|art|fm|ly|xyz)($|\/)/i
    
    // Basic format check
    if (!urlPattern.test(url)) {
      return "Please enter a valid URL (e.g., example.com or https://example.com)"
    }
    
    // Check for common domain extensions
    if (!commonDomains.test(url)) {
      return "Please enter a URL with a common domain extension (.com, .org, .net, etc.)"
    }
    
    return true
  }

  const handleProfileUrlChange = (value: string) => {
    setProfileForm(prev => ({ ...prev, url: value }))
    
    if (value.trim()) {
      const validation = validateUrl(value)
      setProfileUrlError(validation === true ? "" : validation)
    } else {
      setProfileUrlError("")
    }
  }

  const handleEditProfile = () => {
    if (!userProfile) return
    setProfileForm({
      name: userProfile.name || "",
      bio: userProfile.bio || "",
      url: userProfile.url || ""
    })
    setProfileUrlError("")
    setIsEditingProfile(true)
  }

  const handleCancelProfileEdit = () => {
    setIsEditingProfile(false)
    setProfileUrlError("")
    setProfileForm({
      name: userProfile?.name || "",
      bio: userProfile?.bio || "",
      url: userProfile?.url || ""
    })
  }

  const handleSaveProfile = async () => {
    if (!userProfile) return
    
    // Validate URL before saving
    if (profileForm.url.trim()) {
      const validation = validateUrl(profileForm.url)
      if (validation !== true) {
        setProfileUrlError(validation)
        return
      }
    }
    
    setProfileSaveLoading(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      })

      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
        setProfileUrlError("")
        setIsEditingProfile(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setProfileSaveLoading(false)
    }
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
      <h1>Your Profile</h1>
      {/* Profile Info */}
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
          <h2>Hello, {userProfile?.name || session.user.name || session.user.email}!</h2>
          {!isEditingProfile && (
            <button
              onClick={handleEditProfile}
              style={{
                padding: '5px 10px',
                border: '2px solid #000',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Edit Form */}
        {isEditingProfile ? (
          <div className="mb-10">
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Display Name:
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your display name"
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #000',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Bio:
              </label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #000',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
                {profileForm.bio.length}/500
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Website/URL:
              </label>
              <input
                type="text"
                value={profileForm.url}
                onChange={(e) => handleProfileUrlChange(e.target.value)}
                placeholder="https://your-website.com or example.com"
                maxLength={200}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: profileUrlError ? '2px solid #ff0000' : '2px solid #000',
                  fontSize: '14px'
                }}
              />
              {profileUrlError && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#ff0000', 
                  marginTop: '4px' 
                }}>
                  {profileUrlError}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaveLoading || !!profileUrlError}
                style={{
                  padding: '8px 16px',
                  border: '2px solid #000',
                  backgroundColor: (profileSaveLoading || profileUrlError) ? '#ccc' : '#000',
                  color: '#fff',
                  cursor: (profileSaveLoading || profileUrlError) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {profileSaveLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelProfileEdit}
                disabled={profileSaveLoading}
                style={{
                  padding: '8px 16px',
                  border: '2px solid #000',
                  backgroundColor: '#fff',
                  cursor: profileSaveLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Profile Display */
          (userProfile?.bio || userProfile?.url) && (
            <div className="mb-10">
              {userProfile.bio && (
                <div style={{ marginBottom: '8px' }}>
                  {userProfile.bio}
                </div>
              )}
              {userProfile.url && (
                <div style={{ marginBottom: '8px' }}>
                  <a 
                    href={userProfile.url.startsWith('http') ? userProfile.url : `https://${userProfile.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#0066cc', 
                      textDecoration: 'underline',
                      wordBreak: 'break-all'
                    }}
                  >
                    {userProfile.url}
                  </a>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* User Stats */}
      <div className="mb-20" style={{ 
        border: '2px solid #000', 
        padding: '10px', 
        backgroundColor: '#fff',
        marginBottom: '20px'
      }}>
        <h2>Stats</h2>
        <div className="mb-10">
          <ul>
            <li>Releases: {releases.length}</li>
            <li>Total tracks: {getTotalTracks()}</li>
            <li>Singles: {releaseTypeCounts.single} | EPs: {releaseTypeCounts.ep} | Albums: {releaseTypeCounts.album} | Demos: {releaseTypeCounts.demo}</li>
            <li>Total duration: {formatDuration(getTotalDuration())}</li>
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
        <h2>Releases ({releases.length})</h2>
        
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
