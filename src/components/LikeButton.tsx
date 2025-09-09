"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface LikeButtonProps {
  trackId: string
  size?: 'small' | 'medium' | 'large'
  className?: string
  style?: React.CSSProperties
  onChange?: (trackId: string, isLiked: boolean) => void
}

export default function LikeButton({ trackId, size = 'medium', className = '', style = {}, onChange }: LikeButtonProps) {
  const { data: session } = useSession()
  const [isLiked, setIsLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // Size configurations
  const sizeStyles = {
    small: { fontSize: '14px', padding: '2px 4px' },
    medium: { fontSize: '16px', padding: '4px 6px' },
    large: { fontSize: '18px', padding: '6px 8px' }
  }

  // Check if track is liked on component mount
  useEffect(() => {
    if (!session?.user || !trackId) {
      setIsChecking(false)
      return
    }

    const checkLikedStatus = async () => {
      try {
        const response = await fetch('/api/tracks/liked-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trackIds: [trackId] })
        })

        if (response.ok) {
          const data = await response.json()
          setIsLiked(data.likedStatus[trackId] || false)
        }
      } catch (error) {
        console.error('Error checking liked status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkLikedStatus()
  }, [session, trackId])

  // Listen for like status changes from other components
  useEffect(() => {
    const handleLikeStatusChanged = (event: CustomEvent) => {
      const { trackId: changedTrackId, isLiked: newLikedStatus } = event.detail
      if (changedTrackId === trackId) {
        setIsLiked(newLikedStatus)
      }
    }

    window.addEventListener('likeStatusChanged', handleLikeStatusChanged as EventListener)
    return () => {
      window.removeEventListener('likeStatusChanged', handleLikeStatusChanged as EventListener)
    }
  }, [trackId])

  const handleToggleLike = async () => {
    if (!session?.user || isLoading) return

    setIsLoading(true)
    
    try {
      const method = isLiked ? 'DELETE' : 'POST'
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const newLikedState = !isLiked
        setIsLiked(newLikedState)
        onChange?.(trackId, newLikedState)
        
        // Dispatch custom event to notify other LikeButton components
        window.dispatchEvent(new CustomEvent('likeStatusChanged', {
          detail: { trackId, isLiked: newLikedState }
        }))
      } else {
        const errorData = await response.json()
        console.error('Error toggling like:', errorData.error)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if user is not logged in
  if (!session?.user) {
    return null
  }

  // Show loading state while checking initial status
  if (isChecking) {
    return (
      <span
        className={className}
        style={{
          ...sizeStyles[size],
          ...style,
          color: '#ccc',
          cursor: 'default',
          fontFamily: 'Courier New, monospace'
        }}
      >
        ♡
      </span>
    )
  }

  return (
    <span
      onClick={isLoading ? undefined : handleToggleLike}
      onTouchStart={(e) => {
        e.currentTarget.blur()
      }}
      onTouchEnd={(e) => {
        setTimeout(() => e.currentTarget.blur(), 10)
      }}
      className={className}
      style={{
        ...sizeStyles[size],
        ...style,
        color: isLiked ? '#ff0000' : '#666',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontFamily: 'Courier New, monospace',
        opacity: isLoading ? 0.6 : 1,
        transition: 'color 0.2s ease',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.color = isLiked ? '#cc0000' : '#ff0000'
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.color = isLiked ? '#ff0000' : '#666'
        }
      }}
      title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
    >
      {isLiked ? '♥' : '♡'}
    </span>
  )
}