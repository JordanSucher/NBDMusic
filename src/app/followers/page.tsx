"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import FollowButton from "@/components/FollowButton"

interface Follower {
  username: string
  name: string | null
  followedAt: string
}

export default function FollowersPage() {
  const { data: session, status } = useSession()
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (session) {
      fetchFollowers()
    } else if (status !== "loading") {
      setLoading(false)
    }
  }, [session, status])

  const fetchFollowers = async () => {
    try {
      const response = await fetch('/api/user/followers')
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers)
      } else {
        setError("Failed to load followers")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleFollowChange = (username: string, isFollowing: boolean) => {
    // Update UI optimistically - in this case we don't need to do anything
    // since this is just the followers list, not the following list
  }

  if (status === "loading" || loading) {
    return (
      <div className="container">
        <h1>My Followers</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container">
        <h1>My Followers</h1>
        <p>You need to be logged in to view your followers.</p>
        <p><Link href="/login">Login here</Link></p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>My Followers</h1>

      {error && <div className="error">{error}</div>}

      <div className="mb-20">
        <h2>People who follow you ({followers.length})</h2>
        
        {followers.length === 0 ? (
          <div>
            <p>No one is following you yet.</p>
            <p>Share your music and connect with others to build your audience!</p>
            <p><Link href="/browse">Browse music</Link> to discover and follow other artists.</p>
          </div>
        ) : (
          <div>
            {followers.map(follower => (
              <div 
                key={follower.username}
                style={{ 
                  border: '2px solid #000', 
                  padding: '10px', 
                  marginBottom: '10px', 
                  backgroundColor: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                    <Link 
                      href={`/user/${encodeURIComponent(follower.username)}`}
                      style={{ color: '#0000ff', textDecoration: 'underline' }}
                    >
                      {follower.name || follower.username}
                    </Link>
                    {follower.name && (
                      <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                        {' '}(@{follower.username})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    Following since {new Date(follower.followedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link 
                    href={`/user/${encodeURIComponent(follower.username)}`}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      backgroundColor: '#ddd',
                      color: '#000',
                      border: '2px outset #ddd',
                      textDecoration: 'none',
                      fontFamily: 'Courier New, monospace'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.setProperty('background-color', '#bbb', 'important')
                      e.currentTarget.style.setProperty('color', '#000', 'important')
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ddd'
                      e.currentTarget.style.color = '#000'
                    }}
                  >
                    View Profile
                  </Link>
                  <FollowButton 
                    username={follower.username}
                    onFollowChange={(isFollowing) => handleFollowChange(follower.username, isFollowing)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-20">
        <h3>Grow Your Following</h3>
        <ul>
          <li><Link href="/upload">Upload new releases</Link> to give people more music to discover</li>
          <li><Link href="/browse">Browse and follow other artists</Link> - they might follow you back!</li>
          <li>Share your profile link: <code>/user/{session.user?.name || session.user?.email}</code></li>
        </ul>
      </div>
    </div>
  )
}
