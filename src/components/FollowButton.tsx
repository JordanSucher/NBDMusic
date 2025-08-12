import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface FollowButtonProps {
  username: string
  onFollowChange?: (isFollowing: boolean) => void
}

export default function FollowButton({ username, onFollowChange }: FollowButtonProps) {
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
    return (
      <button
        disabled
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          backgroundColor: '#f0f0f0',
          color: '#999',
          border: '2px outset #ddd',
          cursor: 'not-allowed',
          fontFamily: 'Courier New, monospace'
        }}
      >
        ...
      </button>
    )
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={actionLoading}
      style={{
        padding: '4px 12px',
        fontSize: '12px',
        backgroundColor: actionLoading ? '#f0f0f0' : isFollowing ? '#ff6666' : '#4444ff',
        color: 'white',
        border: `2px outset ${actionLoading ? '#ddd' : isFollowing ? '#ff6666' : '#4444ff'}`,
        cursor: actionLoading ? 'not-allowed' : 'pointer',
        fontFamily: 'Courier New, monospace',
        fontWeight: 'bold'
      }}
    >
      {actionLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  )
}
