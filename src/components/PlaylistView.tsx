"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"
import { createReleaseUrl } from "@/utils/slugify"
import { queueGenerator } from "@/lib/QueueGenerator"
import { persistentAudioPlayer } from "@/lib/PersistentAudioPlayer"

interface PlaylistTrack {
  id: string
  title: string
  trackNumber: number
  duration: number | null
  fileUrl: string
  lyrics: string | null
  addedAt: string
  position: number
  release: {
    id: string
    title: string
    releaseType: string
    artworkUrl: string | null
    releaseDate: string | null
  }
  artist: string
  listenCount: number
}

interface PlaylistData {
  playlist: {
    id: string | null
    name: string
    description: string | null
    trackCount: number
    createdAt: string | null
    updatedAt: string | null
    owner?: {
      username: string
      name: string | null
    }
    isOwner?: boolean
  }
  tracks: PlaylistTrack[]
}

interface PlaylistViewProps {
  data: PlaylistData
  isOwned?: boolean
  onRefresh?: () => void
  showBackLink?: {
    href: string
    text: string
  }
  showShareButton?: boolean
  shareUrl?: string
}

export default function PlaylistView({ 
  data, 
  isOwned = false, 
  onRefresh,
  showBackLink,
  showShareButton = false,
  shareUrl = ''
}: PlaylistViewProps) {
  const { data: session } = useSession()
  const queueAudio = useQueueAudioContext()
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{index: number, position: 'before' | 'after'} | null>(null)
  const [linkCopied, setLinkCopied] = useState<boolean>(false)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  const moveTrack = async (fromIndex: number, toIndex: number) => {
    if (!data?.tracks || fromIndex === toIndex || !isOwned) return

    // Only allow reordering for owned playlists
    // TODO: Add API call to persist the new order
    console.log('Track reordering - API persistence not yet implemented')
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy share link:', error)
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const playAll = async () => {
    if (!data?.tracks || data.tracks.length === 0) return

    try {
      const queueTracks = data.tracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        fileUrl: track.fileUrl,
        duration: track.duration,
        trackNumber: track.position,
        releaseId: track.release.id,
        lyrics: track.lyrics
      }))

      const queue = queueGenerator.generateFromTracks(queueTracks, data.playlist.name)
      queue.originalSource = {
        type: 'playlist',
        id: data.playlist.id || 'unknown',
        name: data.playlist.name
      }
      queue.currentIndex = 0
      queueAudio.setCurrentQueue(queue)
      persistentAudioPlayer.play().catch(error => {
        console.error("Auto-play failed:", error)
      })
    } catch (error) {
      console.error("Error playing playlist:", error)
    }
  }

  const shuffleAll = async () => {
    if (!data?.tracks || data.tracks.length === 0) return

    try {
      const queueTracks = data.tracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        fileUrl: track.fileUrl,
        duration: track.duration,
        trackNumber: track.position,
        releaseId: track.release.id,
        lyrics: track.lyrics
      }))

      const queue = queueGenerator.generateFromTracks(queueTracks, data.playlist.name)
      const shuffledTracks = [...queue.tracks].sort(() => Math.random() - 0.5)
      queue.tracks = shuffledTracks
      queue.shuffled = true
      queue.originalSource = {
        type: 'shuffle_all',
        id: data.playlist.id || 'unknown',
        name: `${data.playlist.name} (Shuffled)`
      }
      queue.currentIndex = 0
      queueAudio.setCurrentQueue(queue)
      persistentAudioPlayer.play().catch(error => {
        console.error("Auto-play failed:", error)
      })
    } catch (error) {
      console.error("Error shuffling playlist:", error)
    }
  }

  const playTrack = async (index: number) => {
    try {
      const queueTracks = data.tracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        fileUrl: t.fileUrl,
        duration: t.duration,
        trackNumber: t.position,
        releaseId: t.release.id,
        lyrics: t.lyrics
      }))

      const queue = queueGenerator.generateFromTracks(queueTracks, data.playlist.name)
      queue.originalSource = {
        type: 'playlist',
        id: data.playlist.id || 'unknown',
        name: data.playlist.name
      }
      queue.currentIndex = index
      queueAudio.setCurrentQueue(queue)
      persistentAudioPlayer.play().catch(error => {
        console.error("Auto-play failed:", error)
      })
    } catch (error) {
      console.error("Error playing track:", error)
    }
  }

  return (
    <div className="container">
      {showBackLink && (
        <div style={{ marginBottom: '20px' }}>
          <Link href={showBackLink.href} style={{ color: '#0066cc', textDecoration: 'underline' }}>
            ← {showBackLink.text}
          </Link>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h1>♥ {data.playlist.name}</h1>
        {data.playlist.owner && !isOwned && (
          <p style={{ color: '#666', marginBottom: '10px' }}>
            Shared by <strong>{data.playlist.owner.name || data.playlist.owner.username}</strong>
          </p>
        )}
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '15px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#666'
        }}>
          <span>{data.playlist.trackCount || 0} song{(data.playlist.trackCount || 0) !== 1 ? 's' : ''}</span>
          
          {data.tracks && data.tracks.length > 0 && (
            <>
              <span>•</span>
              <span>
                Total: {formatTime(data.tracks.reduce((total, track) => 
                  total + (track.duration || 0), 0
                ))}
              </span>
            </>
          )}
        </div>

        {data.tracks && data.tracks.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button
              onClick={shuffleAll}
              onTouchStart={(e) => e.currentTarget.blur()}
              onTouchEnd={(e) => setTimeout(() => e.currentTarget.blur(), 10)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ddd',
                color: '#000',
                border: '2px outset #ccc',
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontSize: '12px',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
              onMouseDown={(e) => e.currentTarget.style.border = '2px inset #ccc'}
              onMouseUp={(e) => e.currentTarget.style.border = '2px outset #ccc'}
            >
              &gt; Shuffle
            </button>

            {showShareButton && (
              <button
                onClick={copyShareLink}
                onTouchStart={(e) => e.currentTarget.blur()}
                onTouchEnd={(e) => setTimeout(() => e.currentTarget.blur(), 10)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ddd',
                  color: '#000',
                  border: '2px outset #ccc',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
                onMouseDown={(e) => e.currentTarget.style.border = '2px inset #ccc'}
                onMouseUp={(e) => e.currentTarget.style.border = '2px outset #ccc'}
                title={linkCopied ? "Copied to clipboard!" : "Copy share link"}
              >
                {linkCopied ? '✅ Link Copied' : '📋 Share'}
              </button>
            )}
          </div>
        )}
      </div>

      {!data.tracks || data.tracks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>♡</div>
          <h2>No songs in this playlist</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {isOwned ? "Songs you like will appear here. Look for the ♡ heart icon next to tracks to add them!" : "This playlist is empty."}
          </p>
          {isOwned && (
            <Link 
              href="/browse"
              style={{
                color: '#0066cc',
                textDecoration: 'underline',
                fontWeight: 'bold'
              }}
            >
              Browse Music →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ marginTop: '10px' }}>
          {data.tracks.map((track, index) => {
            const isPlaying = queueAudio.currentTrack?.id === track.id
            const isDragging = draggedIndex === index
            const showDropBefore = dropTarget?.index === index && dropTarget?.position === 'before'
            const showDropAfter = dropTarget?.index === index && dropTarget?.position === 'after'
            
            return (
              <div key={track.id} style={{ marginBottom: '2px', position: 'relative' }}>
                {/* Drop indicator before */}
                {isOwned && showDropBefore && (
                  <div style={{
                    height: '2px',
                    backgroundColor: '#0066cc',
                    margin: '2px 0',
                    borderRadius: '1px'
                  }} />
                )}

                <div 
                  draggable={isOwned}
                  onDragStart={isOwned ? (e) => {
                    setDraggedIndex(index)
                    e.dataTransfer.effectAllowed = 'move'
                  } : undefined}
                  onDragEnd={isOwned ? () => {
                    setDraggedIndex(null)
                    setDropTarget(null)
                  } : undefined}
                  onDragOver={isOwned ? (e) => {
                    e.preventDefault()
                    if (draggedIndex === null || draggedIndex === index) return
                    
                    const rect = e.currentTarget.getBoundingClientRect()
                    const midY = rect.top + rect.height / 2
                    const position = e.clientY < midY ? 'before' : 'after'
                    
                    setDropTarget({ index, position })
                  } : undefined}
                  onDrop={isOwned ? (e) => {
                    e.preventDefault()
                    if (draggedIndex === null || !dropTarget) return
                    
                    let targetIndex = dropTarget.index
                    if (dropTarget.position === 'after') {
                      targetIndex++
                    }
                    
                    if (draggedIndex < targetIndex) {
                      targetIndex--
                    }
                    
                    moveTrack(draggedIndex, targetIndex)
                    setDraggedIndex(null)
                    setDropTarget(null)
                  } : undefined}
                  onClick={() => playTrack(index)}
                  style={{
                    padding: '4px 8px',
                    margin: '2px 0',
                    backgroundColor: isPlaying ? '#ffff00' : '#f5f5f5',
                    border: isPlaying ? '1px solid #000' : '1px solid #ccc',
                    cursor: isDragging ? 'grabbing' : 'pointer',
                    fontSize: '12px',
                    fontFamily: 'Courier New, monospace',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                    flexWrap: 'nowrap',
                    opacity: isDragging ? 0.5 : 1,
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isPlaying) {
                      e.currentTarget.style.backgroundColor = '#e0e0e0'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPlaying) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5'
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flex: '1',
                    minWidth: 0
                  }}>
                    {/* Drag handle (only for owned playlists) */}
                    {isOwned && (
                      <div style={{
                        color: '#999',
                        fontSize: '10px',
                        cursor: 'grab',
                        userSelect: 'none',
                        minWidth: '16px',
                        textAlign: 'center'
                      }}>
                        ⋮⋮
                      </div>
                    )}

                    <span style={{ 
                      flex: '1', 
                      minWidth: '0', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis'
                    }}>
                      {index + 1}. {track.title} - {track.artist}
                    </span>
                  </div>
                  
                  <div style={{ 
                    fontSize: '10px',
                    color: '#666',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center'
                  }}>
                    {track.duration && (
                      <span>{formatTime(track.duration)}</span>
                    )}
                    {track.listenCount > 0 && (
                      <span>• {track.listenCount} plays</span>
                    )}
                    
                    {/* Track Action Menu (only for owned playlists) */}
                    {isOwned && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === track.id ? null : track.id)
                          }}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            backgroundColor: openMenuId === track.id ? '#ddd' : '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontFamily: 'Courier New, monospace',
                            color: '#666'
                          }}
                          onMouseEnter={(e) => {
                            if (openMenuId !== track.id) {
                              e.currentTarget.style.backgroundColor = '#ddd'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (openMenuId !== track.id) {
                              e.currentTarget.style.backgroundColor = '#f0f0f0'
                            }
                          }}
                          title="Track actions"
                        >
                          ⋯
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === track.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              backgroundColor: 'white',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              zIndex: 1000,
                              minWidth: '120px',
                              padding: '4px 0',
                              fontFamily: 'Courier New, monospace',
                              fontSize: '11px'
                            }}
                          >
                            {/* Add to Queue */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const queueTrack = {
                                  id: track.id,
                                  title: track.title,
                                  artist: track.artist,
                                  fileUrl: track.fileUrl,
                                  trackNumber: track.position,
                                  releaseId: track.release.id,
                                  duration: track.duration,
                                  lyrics: track.lyrics
                                }
                                queueAudio.addTrackToEnd(queueTrack)
                                setOpenMenuId(null)
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '4px 8px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontFamily: 'Courier New, monospace'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              + Add to Queue
                            </button>

                            {/* Remove from Playlist */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                
                                try {
                                  const response = await fetch(`/api/tracks/${track.id}/like`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    }
                                  })

                                  if (response.ok) {
                                    onRefresh?.()
                                    
                                    window.dispatchEvent(new CustomEvent('likeStatusChanged', {
                                      detail: { trackId: track.id, isLiked: false }
                                    }))
                                  }
                                } catch (error) {
                                  console.error('Error removing track:', error)
                                }
                                
                                setOpenMenuId(null)
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '4px 8px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontFamily: 'Courier New, monospace',
                                color: '#cc0000'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              ♥ Remove from Liked Songs
                            </button>

                            {/* Copy Link */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const trackUrl = `${window.location.protocol}//${window.location.host}${createReleaseUrl(track.release.id, track.release.title, track.artist)}?track=${track.trackNumber}`
                                navigator.clipboard.writeText(trackUrl)
                                setOpenMenuId(null)
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '4px 8px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontFamily: 'Courier New, monospace'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              📋 Copy Link
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Drop indicator after */}
                {isOwned && showDropAfter && (
                  <div style={{
                    height: '2px',
                    backgroundColor: '#0066cc',
                    margin: '2px 0',
                    borderRadius: '1px'
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}