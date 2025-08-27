"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
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

interface UserProfile {
  username: string
  name: string | null
  bio: string | null
  url: string | null
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
  const { data: session } = useSession()
  const [releases, setReleases] = useState<Release[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [localFollowerCount, setLocalFollowerCount] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    url: ""
  })
  const [saveLoading, setSaveLoading] = useState(false)
  const [urlError, setUrlError] = useState("")
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`/api/user/profile/${encodeURIComponent(username)}`)
        if (response.ok) {
          const data = await response.json()
          setReleases(data.releases)
          setUserProfile(data.profile)
          setLocalFollowerCount(data.profile.followerCount || 0)
          
          // Initialize edit form with current profile data
          setEditForm({
            name: data.profile.name || "",
            bio: data.profile.bio || "",
            url: data.profile.url || ""
          })
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

    const fetchCurrentUser = async () => {
      if (!session?.user?.email) return
      
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setCurrentUser({ id: data.user.id, username: data.user.username })
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error)
      }
    }
    
    if (username) {
      fetchUserProfile()
    }
    
    if (session?.user) {
      fetchCurrentUser()
    }
  }, [username, session])

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

  const handleEditClick = () => {
    if (!userProfile) return
    setEditForm({
      name: userProfile.name || "",
      bio: userProfile.bio || "",
      url: userProfile.url || ""
    })
    setUrlError("")
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setUrlError("")
    setEditForm({
      name: userProfile?.name || "",
      bio: userProfile?.bio || "",
      url: userProfile?.url || ""
    })
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

  const handleUrlChange = (value: string) => {
    setEditForm(prev => ({ ...prev, url: value }))
    
    if (value.trim()) {
      const validation = validateUrl(value)
      setUrlError(validation === true ? "" : validation)
    } else {
      setUrlError("")
    }
  }

  const handleSaveEdit = async () => {
    if (!userProfile) return
    
    // Validate URL before saving
    if (editForm.url.trim()) {
      const validation = validateUrl(editForm.url)
      if (validation !== true) {
        setUrlError(validation)
        return
      }
    }
    
    setSaveLoading(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local profile state
        setUserProfile(prev => prev ? {
          ...prev,
          name: data.user.name,
          bio: data.user.bio,
          url: data.user.url
        } : null)
        setUrlError("")
        setIsEditing(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaveLoading(false)
    }
  }

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser && userProfile && currentUser.username === userProfile.username

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
      <h1>{userProfile.name || userProfile.username}&apos;s Profile</h1>

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
          <h2>About {userProfile.name || userProfile.username}</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isOwnProfile && !isEditing && (
              <button
                onClick={handleEditClick}
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
            {!isOwnProfile && (
              <FollowButton 
                username={userProfile.username} 
                onFollowChange={handleFollowChange}
              />
            )}
          </div>
        </div>
        
        {/* Bio and URL - Edit Mode */}
        {isEditing ? (
          <div className="mb-10">
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Name:
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
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
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
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
                {editForm.bio.length}/500
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Website/URL:
              </label>
              <input
                type="text"
                value={editForm.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://your-website.com or example.com"
                maxLength={200}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: urlError ? '2px solid #ff0000' : '2px solid #000',
                  fontSize: '14px'
                }}
              />
              {urlError && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#ff0000', 
                  marginTop: '4px' 
                }}>
                  {urlError}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveEdit}
                disabled={saveLoading || !!urlError}
                style={{
                  padding: '8px 16px',
                  border: '2px solid #000',
                  backgroundColor: (saveLoading || urlError) ? '#ccc' : '#000',
                  color: '#fff',
                  cursor: (saveLoading || urlError) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saveLoading}
                style={{
                  padding: '8px 16px',
                  border: '2px solid #000',
                  backgroundColor: '#fff',
                  cursor: saveLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Bio and URL - Display Mode */
          (userProfile.bio || userProfile.url || isOwnProfile) && (
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
              {isOwnProfile && !userProfile.bio && !userProfile.url && (
                <div style={{ 
                  color: '#666', 
                  fontStyle: 'italic', 
                  marginBottom: '8px' 
                }}>
                  Add a bio and website to tell people about yourself!
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
        <h2>Releases ({releases.length})</h2>
        
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
