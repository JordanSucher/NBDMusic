"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import FollowButton from "@/components/FollowButton"

interface Following {
  username: string
  name: string | null
  followedAt: string
}

export default function FollowingPage() {
  const { data: session, status } = useSession()
  const [following, setFollowing] = useState<Following[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (session) {
      fetchFollowing()
    } else if (status !== "loading") {
      setLoading(false)
    }
  }, [session, status])

  const fetchFollowing = async () => {
    try {
      const response = await fetch('/api/user/following')
      if (response.ok) {
        const data = await response.json()
        setFollowing(data.following)
      } else {
        setError("Failed to load following list")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleFollowChange = (username: string, isFollowing: boolean) => {
    if (!isFollowing) {
      // Remove from following list when unfollowed
      setFollowing(prev => prev.filter(user => user.username !== username))
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="container">
        <h1>Following</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container">
        <h1>Following</h1>
        <p>You need to be logged in to view who you follow.</p>
        <p><Link href="/login">Login here</Link></p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Following</h1>

      {error && <div className="error">{error}</div>}

      <div className="mb-20">
        <h2>People you follow ({following.length})</h2>
        
        {following.length === 0 ? (
          <div>
            <p>You aren&apos;t following anyone yet.</p>
            <p><Link href="/browse">Browse music</Link> to discover artists to follow!</p>
            <p>Following artists lets you see their new releases and filter the browse page to show only their music.</p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <Link 
                href="/browse?following=true"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#4444ff',
                  color: 'white',
                  border: '2px outset #4444ff',
                  textDecoration: 'none',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: 'bold'
                }}
              >
                🎵 View releases from people you follow
              </Link>
            </div>

            {following.map(user => (
              <div 
                key={user.username}
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
                      href={`/user/${encodeURIComponent(user.username)}`}
                      style={{ color: '#0000ff', textDecoration: 'underline' }}
                    >
                      {user.name || user.username}
                    </Link>
                    {user.name && (
                      <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                        {' '}(@{user.username})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    Following since {new Date(user.followedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link 
                    href={`/user/${encodeURIComponent(user.username)}`}
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
                    username={user.username}
                    onFollowChange={(isFollowing) => handleFollowChange(user.username, isFollowing)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-20">
        <h3>Discovery</h3>
        <ul>
          <li><Link href="/browse">Browse all releases</Link> to find new artists</li>
          <li><Link href="/browse?following=true">View releases from people you follow</Link></li>
          <li>Check out <Link href="/browse">popular tags</Link> to discover music by genre</li>
        </ul>
      </div>
    </div>
  )
}
