import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface FollowButtonProps {
  username: string
  onFollowChange?: (isFollowing: boolean) => void
  size?: 'normal' | 'small'
  variant?: 'button' | 'link'
}

export default function FollowButton({ username, onFollowChange, size = 'normal', variant = 'button' }: FollowButtonProps) {
  const { data: session } = useSession()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/follow/${encodeURIComponent(username)}`)
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(data.following)
        }
      } catch (error) {
        console.error("Failed to check follow status:", error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      checkFollowStatus()
    } else {
      setLoading(false)
    }
  }, [session, username])


  const handleFollowToggle = async () => {
    if (!session?.user) return

    setActionLoading(true)
    
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/follow/${encodeURIComponent(username)}`, {
        method
      })

      if (response.ok) {
        const newFollowStatus = !isFollowing
        setIsFollowing(newFollowStatus)
        
        if (onFollowChange) {
          onFollowChange(newFollowStatus)
        }
      } else {
        const data = await response.json()
        console.error("Follow action failed:", data.error)
      }
    } catch (error) {
      console.error("Follow action error:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Don't show button if not logged in or if it's the user's own profile
  if (!session?.user || session.user.name === username || session.user.email === username) {
    return null
  }

  if (loading) {
    if (variant === 'link') {
      return (
        <span style={{
          fontSize: '10px',
          color: '#999',
          fontFamily: 'Courier New, monospace'
        }}>
          ...
        </span>
      )
    }
    return (
      <button
        disabled
        style={{
          padding: size === 'small' ? '2px 6px' : '4px 12px',
          fontSize: size === 'small' ? '10px' : '12px',
          backgroundColor: '#f0f0f0',
          color: '#999',
          border: size === 'small' ? '1px outset #ddd' : '2px outset #ddd',
          cursor: 'not-allowed',
          fontFamily: 'Courier New, monospace'
        }}
      >
        ...
      </button>
    )
  }

  if (variant === 'link') {
    return (
      <span
        onClick={handleFollowToggle}
        style={{
          fontSize: '10px',
          color: actionLoading ? '#999' : isFollowing ? '#ff0000' : '#0000ff',
          cursor: actionLoading ? 'default' : 'pointer',
          fontFamily: 'Courier New, monospace',
          textDecoration: 'underline'
        }}
        onMouseDown={(e) => e.preventDefault()}
        onFocus={(e) => e.blur()}
      >
        {actionLoading ? '...' : isFollowing ? 'unfollow' : 'follow'}
      </span>
    )
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={actionLoading}
      style={{
        padding: size === 'small' ? '2px 6px' : '4px 12px',
        fontSize: size === 'small' ? '10px' : '12px',
        backgroundColor: actionLoading ? '#f0f0f0' : isFollowing ? '#ff6666' : '#4444ff',
        color: 'white',
        border: `${size === 'small' ? '1px' : '2px'} outset ${actionLoading ? '#ddd' : isFollowing ? '#ff6666' : '#4444ff'}`,
        cursor: actionLoading ? 'not-allowed' : 'pointer',
        fontFamily: 'Courier New, monospace',
        fontWeight: 'bold'
      }}
    >
      {actionLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  )
}
