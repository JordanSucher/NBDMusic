"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"
import { createReleaseUrl } from "@/utils/slugify"

interface Track {
  id: string
  title: string
  trackNumber?: number
  position?: number
  fileUrl: string
  duration: number | null
  lyrics?: string | null
  release?: {
    id: string
    title: string
    artworkUrl?: string | null
  }
  artist?: string
  releaseId?: string
  releaseTitle?: string
  listenCount?: number
  _count?: {
    listens: number
  }
}

interface TrackActionMenuProps {
  track: Track
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  context?: 'playlist' | 'release'
  releaseInfo?: {
    id: string
    title: string
    artist: string
    artworkUrl?: string | null
  }
  onRefresh?: () => void
  showLikeAction?: boolean
  isLiked?: boolean
  onLikeChange?: (trackId: string, isLiked: boolean) => void
  className?: string
}

export default function TrackActionMenu({
  track,
  isOpen,
  onToggle,
  onClose,
  context = 'playlist',
  releaseInfo,
  onRefresh,
  showLikeAction = true,
  isLiked = false,
  onLikeChange,
  className = ''
}: TrackActionMenuProps) {
  const queueAudio = useQueueAudioContext()
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close menu when clicking outside or pressing ESC
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.track-action-menu')) {
        onClose()
      }
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleAddToQueue = () => {
    const releaseId = track.releaseId || track.release?.id || releaseInfo?.id
    const releaseTitle = track.releaseTitle || track.release?.title || releaseInfo?.title
    
    if (!releaseId || !releaseTitle) {
      console.error('Cannot add track to queue: missing release information')
      return
    }
    
    const queueTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist || releaseInfo?.artist || 'Unknown Artist',
      fileUrl: track.fileUrl,
      trackNumber: track.trackNumber || track.position || 1,
      releaseId,
      releaseTitle,
      listenCount: track.listenCount || track._count?.listens || 0,
      duration: track.duration,
      lyrics: track.lyrics,
      artworkUrl: track.release?.artworkUrl || releaseInfo?.artworkUrl
    }
    queueAudio.addTrackToEnd(queueTrack)
    onClose()
  }

  const handleLikeToggle = async () => {
    if (!showLikeAction) return

    const method = isLiked ? 'DELETE' : 'POST'
    
    try {
      const response = await fetch(`/api/tracks/${track.id}/like`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const newLikedStatus = !isLiked
        onLikeChange?.(track.id, newLikedStatus)
        onRefresh?.()
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('likeStatusChanged', {
          detail: { trackId: track.id, isLiked: newLikedStatus }
        }))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
    
    onClose()
  }

  const handleCopyLink = () => {
    const releaseId = track.releaseId || track.release?.id || releaseInfo?.id
    const releaseTitle = track.releaseTitle || track.release?.title || releaseInfo?.title
    const artist = track.artist || releaseInfo?.artist || 'Unknown Artist'
    const trackNumber = track.trackNumber || track.position || 1

    if (releaseId && releaseTitle) {
      const trackUrl = `${window.location.protocol}//${window.location.host}${createReleaseUrl(releaseId, releaseTitle, artist)}?track=${trackNumber}`
      navigator.clipboard.writeText(trackUrl)
    }
    onClose()
  }

  // Use unified styling for all contexts
  const isPlaylistContext = context === 'playlist'
  const buttonStyle = {
    // Unified grey style
    padding: '2px 6px',
    fontSize: '10px',
    backgroundColor: isOpen ? '#ccc' : '#e0e0e0',
    borderStyle: 'none',
    borderWidth: '0',
    cursor: 'pointer',
    fontFamily: 'Courier New, monospace',
    color: '#000',
    outline: 'none',
    // Add these for mobile to completely override global styles
    ...(isMobile && {
      boxShadow: 'none',
      WebkitAppearance: 'none' as const,
      MozAppearance: 'none' as const,
      appearance: 'none' as const,
      WebkitTapHighlightColor: 'transparent'
    })
  }

  const dropdownStyle = {
    // Unified style for all contexts
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    backgroundColor: '#e0e0e0',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#000',
    zIndex: 150,
    minWidth: '120px',
    fontFamily: 'Courier New, monospace',
    fontSize: '11px',
    boxShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  }

  const buttonItemStyle = {
    display: 'block',
    width: '100%',
    padding: '6px 8px',
    borderStyle: 'none',
    borderWidth: '0',
    backgroundColor: 'transparent',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '10px',
    fontFamily: 'Courier New, monospace',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid' as const,
    borderBottomColor: '#000'
  }

  const hoverColor = '#ccc'

  return (
    <div className={`track-action-menu ${className}`} style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        style={buttonStyle}
        onMouseEnter={(e) => {
          if (!isOpen) {
            if (isMobile) {
              // Mobile: completely flat for all contexts
              e.currentTarget.style.cssText = `
                background-color: #ccc !important;
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
                padding: 2px 6px !important;
                font-size: 10px !important;
                font-family: 'Courier New', monospace !important;
                color: #000 !important;
                cursor: pointer !important;
                border-style: none !important;
                border-width: 0 !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
                -webkit-tap-highlight-color: transparent !important;
              `
            } else {
              e.currentTarget.style.backgroundColor = '#ccc'
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            if (isMobile) {
              // Mobile: completely flat for all contexts
              e.currentTarget.style.cssText = `
                background-color: #e0e0e0 !important;
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
                padding: 2px 6px !important;
                font-size: 10px !important;
                font-family: 'Courier New', monospace !important;
                color: #000 !important;
                cursor: pointer !important;
                border-style: none !important;
                border-width: 0 !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
                -webkit-tap-highlight-color: transparent !important;
              `
            } else {
              e.currentTarget.style.backgroundColor = '#e0e0e0'
            }
          }
        }}
        onMouseDown={isMobile ? (e) => {
          // Mobile: force flat active state for all contexts
          e.currentTarget.style.cssText = `
            background-color: #ccc !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            padding: 2px 6px !important;
            font-size: 10px !important;
            font-family: 'Courier New', monospace !important;
            color: #000 !important;
            cursor: pointer !important;
            border-style: none !important;
            border-width: 0 !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            -webkit-tap-highlight-color: transparent !important;
          `
        } : undefined}
        onMouseUp={isMobile ? (e) => {
          // Mobile: keep flat after click for all contexts
          e.currentTarget.style.cssText = `
            background-color: #e0e0e0 !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            padding: 2px 6px !important;
            font-size: 10px !important;
            font-family: 'Courier New', monospace !important;
            color: #000 !important;
            cursor: pointer !important;
            border-style: none !important;
            border-width: 0 !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            -webkit-tap-highlight-color: transparent !important;
          `
        } : undefined}
        title="Track actions"
      >
        ⋯
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={dropdownStyle}
        >
          {/* Add to Queue */}
          <button
            onClick={handleAddToQueue}
            style={buttonItemStyle}
            onMouseEnter={(e) => {
              if (isMobile) {
                e.currentTarget.style.cssText = `
                  display: block !important;
                  width: 100% !important;
                  padding: 6px 8px !important;
                  border: none !important;
                  background-color: #ccc !important;
                  text-align: left !important;
                  cursor: pointer !important;
                  font-size: 10px !important;
                  font-family: 'Courier New', monospace !important;
                  border-bottom-width: 1px !important;
                  border-bottom-style: solid !important;
                  border-bottom-color: #000 !important;
                  box-shadow: none !important;
                  outline: none !important;
                  -webkit-appearance: none !important;
                  -moz-appearance: none !important;
                  appearance: none !important;
                  -webkit-tap-highlight-color: transparent !important;
                `
              } else {
                e.currentTarget.style.backgroundColor = hoverColor
              }
            }}
            onMouseLeave={(e) => {
              if (isMobile) {
                e.currentTarget.style.cssText = `
                  display: block !important;
                  width: 100% !important;
                  padding: 6px 8px !important;
                  border: none !important;
                  background-color: transparent !important;
                  text-align: left !important;
                  cursor: pointer !important;
                  font-size: 10px !important;
                  font-family: 'Courier New', monospace !important;
                  border-bottom-width: 1px !important;
                  border-bottom-style: solid !important;
                  border-bottom-color: #000 !important;
                  box-shadow: none !important;
                  outline: none !important;
                  -webkit-appearance: none !important;
                  -moz-appearance: none !important;
                  appearance: none !important;
                  -webkit-tap-highlight-color: transparent !important;
                `
              } else {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            + Add to Queue
          </button>

          {/* Like/Unlike or Remove from Liked Songs */}
          {showLikeAction && (
            <button
              onClick={handleLikeToggle}
              style={buttonItemStyle}
              onMouseEnter={(e) => {
                if (isMobile) {
                  e.currentTarget.style.cssText = `
                    display: block !important;
                    width: 100% !important;
                    padding: 6px 8px !important;
                    border: none !important;
                    background-color: #ccc !important;
                    text-align: left !important;
                    cursor: pointer !important;
                    font-size: 10px !important;
                    font-family: 'Courier New', monospace !important;
                    border-bottom-width: 1px !important;
                    border-bottom-style: solid !important;
                    border-bottom-color: #000 !important;
                    box-shadow: none !important;
                    outline: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    appearance: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                  `
                } else {
                  e.currentTarget.style.backgroundColor = hoverColor
                }
              }}
              onMouseLeave={(e) => {
                if (isMobile) {
                  e.currentTarget.style.cssText = `
                    display: block !important;
                    width: 100% !important;
                    padding: 6px 8px !important;
                    border: none !important;
                    background-color: transparent !important;
                    text-align: left !important;
                    cursor: pointer !important;
                    font-size: 10px !important;
                    font-family: 'Courier New', monospace !important;
                    border-bottom-width: 1px !important;
                    border-bottom-style: solid !important;
                    border-bottom-color: #000 !important;
                    box-shadow: none !important;
                    outline: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    appearance: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                  `
                } else {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {context === 'playlist' ? (
                `♥ Remove from Liked Songs`
              ) : (
                <>
                  <span style={{ marginRight: '6px', fontSize: '12px' }}>
                    {isLiked ? '♥' : '♡'}
                  </span>
                  {isLiked ? 'Unlike Track' : 'Like Track'}
                </>
              )}
            </button>
          )}

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            style={{
              ...buttonItemStyle,
              borderBottomStyle: 'none',
              borderBottomWidth: '0'
            }}
            onMouseEnter={(e) => {
              if (isMobile) {
                e.currentTarget.style.cssText = `
                  display: block !important;
                  width: 100% !important;
                  padding: 6px 8px !important;
                  border: none !important;
                  background-color: #ccc !important;
                  text-align: left !important;
                  cursor: pointer !important;
                  font-size: 10px !important;
                  font-family: 'Courier New', monospace !important;
                  box-shadow: none !important;
                  outline: none !important;
                  -webkit-appearance: none !important;
                  -moz-appearance: none !important;
                  appearance: none !important;
                  -webkit-tap-highlight-color: transparent !important;
                `
              } else {
                e.currentTarget.style.backgroundColor = hoverColor
              }
            }}
            onMouseLeave={(e) => {
              if (isMobile) {
                e.currentTarget.style.cssText = `
                  display: block !important;
                  width: 100% !important;
                  padding: 6px 8px !important;
                  border: none !important;
                  background-color: transparent !important;
                  text-align: left !important;
                  cursor: pointer !important;
                  font-size: 10px !important;
                  font-family: 'Courier New', monospace !important;
                  box-shadow: none !important;
                  outline: none !important;
                  -webkit-appearance: none !important;
                  -moz-appearance: none !important;
                  appearance: none !important;
                  -webkit-tap-highlight-color: transparent !important;
                `
              } else {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            📋 Copy Link
          </button>
        </div>
      )}
    </div>
  )
}