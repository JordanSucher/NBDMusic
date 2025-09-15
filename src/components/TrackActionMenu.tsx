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
  currentPlaylistId?: string
  showRemoveFromPlaylist?: boolean
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
  className = '',
  currentPlaylistId,
  showRemoveFromPlaylist = false
}: TrackActionMenuProps) {
  const queueAudio = useQueueAudioContext()
  const [isMobile, setIsMobile] = useState(false)
  const [parentRow, setParentRow] = useState<HTMLTableRowElement | null>(null)
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [availablePlaylists, setAvailablePlaylists] = useState<Array<{id: string, name: string, isSystem?: boolean}>>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null)
  const [successMessageFading, setSuccessMessageFading] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const wasMobile = isMobile
      const nowMobile = window.innerWidth <= 768
      setIsMobile(nowMobile)
      
      // Reset button styles when switching between mobile/desktop
      if (wasMobile !== nowMobile && buttonRef && !isOpen) {
        buttonRef.style.cssText = `
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
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [isMobile, buttonRef, isOpen])

  // Capture parent row/element reference when menu opens
  useEffect(() => {
    if (isOpen && !parentRow && buttonRef) {
      // Try to find table row first (for PlaylistView)
      const row = buttonRef.closest('tr') as HTMLTableRowElement
      if (row) {
        setParentRow(row)
      } else {
        // If no table row, look for the track div that contains the hover state (for ReleaseCard)
        // Walk up the DOM tree to find a div with onMouseEnter/onMouseLeave handlers
        let parent = buttonRef.parentElement
        while (parent) {
          // Look for div elements that have the track styling structure
          if (parent.tagName === 'DIV' && 
              parent.style.cursor === 'pointer' &&
              parent.style.backgroundColor) {
            setParentRow(parent as HTMLTableRowElement)
            break
          }
          parent = parent.parentElement
        }
      }
    } else if (!isOpen) {
      setParentRow(null)
    }
  }, [isOpen, parentRow, buttonRef])

  // Close menu when clicking outside, pressing ESC, or scrolling
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

    const handleScroll = () => {
      onClose()
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('scroll', handleScroll, true)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, onClose])

  // Close playlist modal when pressing ESC
  useEffect(() => {
    if (!showPlaylistModal) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPlaylistModal(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showPlaylistModal])

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
    
    // Manually reset hover state before closing
    if (parentRow) {
      // For PlaylistView (table rows), reset to white
      // For ReleaseCard (track divs), reset to light gray
      const isTableRow = parentRow.tagName === 'TR'
      parentRow.style.backgroundColor = isTableRow ? '#fff' : '#f5f5f5'
    }
    
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
    
    // Manually reset hover state before closing
    if (parentRow) {
      // For PlaylistView (table rows), reset to white
      // For ReleaseCard (track divs), reset to light gray
      const isTableRow = parentRow.tagName === 'TR'
      parentRow.style.backgroundColor = isTableRow ? '#fff' : '#f5f5f5'
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
    
    // Manually reset hover state before closing
    if (parentRow) {
      // For PlaylistView (table rows), reset to white
      // For ReleaseCard (track divs), reset to light gray
      const isTableRow = parentRow.tagName === 'TR'
      parentRow.style.backgroundColor = isTableRow ? '#fff' : '#f5f5f5'
    }
    
    onClose()
  }

  const handleAddToPlaylist = async () => {
    // Close the action menu first
    onClose()
    
    setLoadingPlaylists(true)
    try {
      const response = await fetch('/api/playlists')
      if (response.ok) {
        const data = await response.json()
        setAvailablePlaylists(data.playlists.filter((p: any) => !p.isSystem))
        setShowPlaylistModal(true)
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setLoadingPlaylists(false)
    }
  }

  const handleRemoveFromPlaylist = async () => {
    if (!currentPlaylistId) return
    
    // Close the action menu first
    onClose()
    
    try {
      const response = await fetch(`/api/playlists/${currentPlaylistId}/tracks?trackId=${track.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Show success message
        setShowSuccessMessage(`Removed from playlist`)
        setSuccessMessageFading(false)
        
        // Refresh the playlist view
        onRefresh?.()
        
        // Start fade out after 1.5 seconds
        setTimeout(() => {
          setSuccessMessageFading(true)
        }, 1500)
        
        // Hide success message after fade completes
        setTimeout(() => {
          setShowSuccessMessage(null)
          setSuccessMessageFading(false)
        }, 2000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to remove track from playlist:', errorData)
        setShowSuccessMessage('Failed to remove from playlist')
        setSuccessMessageFading(false)
        
        setTimeout(() => {
          setSuccessMessageFading(true)
        }, 1500)
        
        setTimeout(() => {
          setShowSuccessMessage(null)
          setSuccessMessageFading(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Error removing track from playlist:', error)
      setShowSuccessMessage('Error removing from playlist')
      setSuccessMessageFading(false)
      
      setTimeout(() => {
        setSuccessMessageFading(true)
      }, 1500)
      
      setTimeout(() => {
        setShowSuccessMessage(null)
        setSuccessMessageFading(false)
      }, 2000)
    }
  }

  const handlePlaylistSelect = async (playlistId: string) => {
    const selectedPlaylist = availablePlaylists.find(p => p.id === playlistId)
    
    try {
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId: track.id }),
      })

      if (response.ok) {
        // Show success message
        setShowSuccessMessage(`Added to "${selectedPlaylist?.name || 'playlist'}"`)
        setSuccessMessageFading(false)
        
        // Hide the modal
        setShowPlaylistModal(false)
        
        // Start fade out after 1.5 seconds
        setTimeout(() => {
          setSuccessMessageFading(true)
        }, 1500)
        
        // Hide success message after fade completes
        setTimeout(() => {
          setShowSuccessMessage(null)
          setSuccessMessageFading(false)
          
          // Manually reset hover state and close menu
          if (parentRow) {
            const isTableRow = parentRow.tagName === 'TR'
            parentRow.style.backgroundColor = isTableRow ? '#fff' : '#f5f5f5'
          }
          
          onClose()
        }, 2000)
      } else {
        // Handle different error cases
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = 'Failed to add to playlist'
        
        // Check for duplicate track error
        if (response.status === 400 && 
            errorData.error === "Track is already in this playlist") {
          errorMessage = 'Track already in playlist'
        }
        
        console.error('Failed to add track to playlist:', errorData)
        setShowSuccessMessage(errorMessage)
        setSuccessMessageFading(false)
        
        // Hide the modal
        setShowPlaylistModal(false)
        
        setTimeout(() => {
          setSuccessMessageFading(true)
        }, 1500)
        
        setTimeout(() => {
          setShowSuccessMessage(null)
          setSuccessMessageFading(false)
          
          // Manually reset hover state and close menu
          if (parentRow) {
            const isTableRow = parentRow.tagName === 'TR'
            parentRow.style.backgroundColor = isTableRow ? '#fff' : '#f5f5f5'
          }
          
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Error adding track to playlist:', error)
      setShowSuccessMessage('Error adding to playlist')
      setSuccessMessageFading(false)
      
      setTimeout(() => {
        setSuccessMessageFading(true)
      }, 1500)
      
      setTimeout(() => {
        setShowSuccessMessage(null)
        setSuccessMessageFading(false)
      }, 2000)
    }
  }

  // Use unified styling for all contexts
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
    backgroundColor: '#e0e0e0',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#000',
    zIndex: 10020,
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
        ref={(el) => setButtonRef(el)}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        style={buttonStyle}
        onMouseEnter={(e) => {
          if (!isOpen) {
            // Always keep flat for all contexts
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
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            // Always keep flat for all contexts
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
          }
        }}
        onMouseDown={(e) => {
          // Always force flat active state for all contexts
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
        }}
        onMouseUp={(e) => {
          // Always keep flat after click for all contexts
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
        }}
        title="Track actions"
      >
        ⋯
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            ...dropdownStyle,
            position: 'fixed',
            top: buttonRef ? buttonRef.getBoundingClientRect().bottom : 0,
            right: buttonRef ? window.innerWidth - buttonRef.getBoundingClientRect().right : 0,
          }}
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

          {/* Remove from Playlist (if applicable) */}
          {showRemoveFromPlaylist && currentPlaylistId && (
            <button
              onClick={handleRemoveFromPlaylist}
              style={buttonItemStyle}
              onMouseEnter={(e) => {
                // Always keep flat for all contexts
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
              }}
              onMouseLeave={(e) => {
                // Always keep flat for all contexts
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
              }}
            >
              🗑️ Remove from Playlist
            </button>
          )}

          {/* Add to Playlist */}
          <button
            onClick={handleAddToPlaylist}
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
            📁 Add to Playlist
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
        </div>,
        document.body
      )}

      {/* Playlist Selection Modal */}
      {showPlaylistModal && typeof window !== 'undefined' && createPortal(
        <>
          {/* Modal backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10010,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={() => setShowPlaylistModal(false)}
          >
            {/* Modal content */}
            <div
              style={{
                backgroundColor: '#e0e0e0',
                border: '2px solid #000',
                minWidth: '300px',
                maxWidth: '400px',
                maxHeight: '80vh',
                fontFamily: 'Courier New, monospace',
                fontSize: '12px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#d0d0d0',
                borderBottom: '1px solid #000',
                fontWeight: 'bold'
              }}>
                Add "{track.title}" to Playlist
              </div>

              {/* Playlist list */}
              <div style={{ 
                maxHeight: 'calc(80vh - 60px)', 
                overflowY: 'auto',
                padding: '8px 0'
              }}>
                {loadingPlaylists ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>Loading playlists...</div>
                ) : availablePlaylists.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>No playlists available</div>
                ) : (
                  availablePlaylists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handlePlaylistSelect(playlist.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'Courier New, monospace'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ccc'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      🎵 {playlist.name}
                    </button>
                  ))
                )}
              </div>

              {/* Modal footer */}
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid #000',
                textAlign: 'right'
              }}>
                <button
                  onClick={() => setShowPlaylistModal(false)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ddd',
                    border: '2px outset #ccc',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontFamily: 'Courier New, monospace'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
                  onMouseDown={(e) => e.currentTarget.style.border = '2px inset #ccc'}
                  onMouseUp={(e) => e.currentTarget.style.border = '2px outset #ccc'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Success Message */}
      {showSuccessMessage && typeof window !== 'undefined' && createPortal(
        <div
          className="success-message"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#e0e0e0',
            border: '2px solid #000',
            padding: '12px 16px',
            zIndex: 10011,
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '4px 4px 8px rgba(0,0,0,0.3)',
            opacity: successMessageFading ? 0 : 1
          }}
        >
          ✓ {showSuccessMessage}
        </div>,
        document.body
      )}
    </div>
  )
}