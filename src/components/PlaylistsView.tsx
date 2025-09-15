"use client"

import React, { useState, useEffect } from "react"
import { flushSync } from "react-dom"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"
import { createReleaseUrl } from "@/utils/slugify"
import { queueGenerator } from "@/lib/QueueGenerator"
import { persistentAudioPlayer } from "@/lib/PersistentAudioPlayer"
import TrackActionMenu from "./TrackActionMenu"

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

interface PlaylistInfo {
  id: string | null
  name: string
  description: string | null
  trackCount: number
  isSystem: boolean
  isPublic: boolean
  createdAt: string | null
  updatedAt: string | null
}

interface PlaylistData {
  playlist: PlaylistInfo
  tracks: PlaylistTrack[]
}

interface PlaylistsViewProps {
  onRefresh?: () => void
}

export default function PlaylistsView({ onRefresh }: PlaylistsViewProps) {
  const { data: session } = useSession()
  const queueAudio = useQueueAudioContext()
  
  // State for playlists management
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistInfo | null>(null)
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Mobile state for navigation
  const [mobileView, setMobileView] = useState<'playlists' | 'tracks'>('playlists')
  const [isMobile, setIsMobile] = useState(false)
  
  // Track-specific state from original PlaylistView
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{index: number, position: 'before' | 'after'} | null>(null)
  const [animatingTrackId, setAnimatingTrackId] = useState<string | null>(null)
  const [animationOffset, setAnimationOffset] = useState<number>(0)
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState<boolean>(false)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false)
  const [newPlaylistName, setNewPlaylistName] = useState<string>("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState<string>("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [playlistToDelete, setPlaylistToDelete] = useState<PlaylistInfo | null>(null)

  // Reset hover states when menu closes
  useEffect(() => {
    if (!openMenuId) {
      // Force a document mousemove event to reset hover states
      setTimeout(() => {
        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: -1, // Move cursor outside any element
          clientY: -1
        })
        document.dispatchEvent(event)
      }, 10)
    }
  }, [openMenuId])

  // Handle ESC key for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          cancelDelete()
        } else if (showCreateForm) {
          setShowCreateForm(false)
          setNewPlaylistName("")
          setNewPlaylistDescription("")
        }
      }
    }

    if (showDeleteConfirm || showCreateForm) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDeleteConfirm, showCreateForm])

  // Fetch all playlists
  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists")
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists)
        
        // Auto-select liked songs if it exists, otherwise first playlist
        const likedSongs = data.playlists.find((p: PlaylistInfo) => p.isSystem && p.name === "Liked Songs")
        if (likedSongs) {
          setSelectedPlaylist(likedSongs)
        } else if (data.playlists.length > 0) {
          setSelectedPlaylist(data.playlists[0])
        }
      } else {
        setError("Failed to load playlists")
      }
    } catch (error) {
      console.error("Error fetching playlists:", error)
      setError("Failed to load playlists")
    }
  }

  // Fetch specific playlist data
  const fetchPlaylistData = async (playlistId: string) => {
    try {
      const endpoint = playlistId && playlistId !== 'null' 
        ? `/api/playlists/${playlistId}`
        : '/api/playlists/liked-songs'
        
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setPlaylistData(data)
      } else {
        setError("Failed to load playlist data")
      }
    } catch (error) {
      console.error("Error fetching playlist data:", error)
      setError("Failed to load playlist data")
    }
  }

  // Handle mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    // Set initial value
    handleResize()
    
    // Listen for resize events
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load playlists on mount
  useEffect(() => {
    if (session?.user) {
      fetchPlaylists()
      setLoading(false)
    }
  }, [session])

  // Load playlist data when selected playlist changes
  useEffect(() => {
    if (selectedPlaylist?.id) {
      fetchPlaylistData(selectedPlaylist.id)
    }
  }, [selectedPlaylist])

  // Handle playlist selection
  const handlePlaylistSelect = (playlist: PlaylistInfo) => {
    setSelectedPlaylist(playlist)
    if (isMobile) {
      setMobileView('tracks')
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const copyShareLink = async () => {
    if (!selectedPlaylist?.id) return
    
    try {
      const shareUrl = `${window.location.protocol}//${window.location.host}/shared/playlist/${selectedPlaylist.id}`
      await navigator.clipboard.writeText(shareUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy share link:', error)
    }
  }

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim() || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        await fetchPlaylists() // Refresh playlist list
        setSelectedPlaylist(data.playlist) // Select new playlist
        setShowCreateForm(false)
        setNewPlaylistName("")
        setNewPlaylistDescription("")
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to create playlist")
      }
    } catch (error) {
      console.error("Error creating playlist:", error)
      alert("Failed to create playlist")
    }
  }

  const showDeleteModal = (playlist: PlaylistInfo) => {
    setPlaylistToDelete(playlist)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!playlistToDelete?.id) return

    try {
      const response = await fetch(`/api/playlists/${playlistToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPlaylists() // Refresh playlist list
        // Select liked songs or first playlist if current was deleted
        if (selectedPlaylist?.id === playlistToDelete.id) {
          const likedSongs = playlists.find(p => p.isSystem && p.name === "Liked Songs")
          if (likedSongs) {
            setSelectedPlaylist(likedSongs)
          } else if (playlists.length > 0) {
            setSelectedPlaylist(playlists[0])
          } else {
            setSelectedPlaylist(null)
          }
        }
        
        // Close modal
        setShowDeleteConfirm(false)
        setPlaylistToDelete(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete playlist")
      }
    } catch (error) {
      console.error("Error deleting playlist:", error)
      setError("Failed to delete playlist")
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setPlaylistToDelete(null)
  }

  const moveTrack = async (fromIndex: number, toIndex: number) => {
    if (!playlistData?.tracks || fromIndex === toIndex || !selectedPlaylist?.id || (selectedPlaylist.isSystem && selectedPlaylist.name !== "Liked Songs")) return

    // Clear hover state immediately when move begins
    setHoveredTrackId(null)
    
    console.log('Move starting - clearing hover state')

    const movedTrack = playlistData.tracks[fromIndex]
    const leftOffset = -50
    
    const newTracks = [...playlistData.tracks]
    const [track] = newTracks.splice(fromIndex, 1)
    newTracks.splice(toIndex, 0, track)
    
    const updatedTracks = newTracks.map((track, index) => ({
      ...track,
      position: index + 1
    }))

    // Set animation state AFTER preparing the new data but BEFORE updating DOM
    setAnimatingTrackId(movedTrack.id)
    setAnimationOffset(leftOffset)
    
    // Use requestAnimationFrame to ensure animation state is applied before DOM update
    requestAnimationFrame(() => {
      setPlaylistData({
        ...playlistData,
        tracks: updatedTracks
      })
      
      // Clear hover state after DOM update
      setHoveredTrackId(null)
      console.log('DOM updated - clearing hover state')
      
      // Reset animation
      setTimeout(() => {
        setAnimationOffset(0)
        setTimeout(() => {
          setAnimatingTrackId(null)
          // Final hover state clear when move fully completes
          setHoveredTrackId(null)
          console.log('Move finished - clearing hover state')
        }, 600)
      }, 50)
    })
    
    // Persist to API
    try {
      const trackUpdates = updatedTracks.map((track, index) => ({
        trackId: track.id,
        position: index + 1
      }))

      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUpdates })
      })

      if (!response.ok) {
        console.error('Failed to persist track reordering')
      }
    } catch (error) {
      console.error('Error persisting track reordering:', error)
    }
  }

  const shuffleAll = async () => {
    if (!playlistData?.tracks || playlistData.tracks.length === 0) return

    try {
      const queueTracks = playlistData.tracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        fileUrl: track.fileUrl,
        duration: track.duration,
        trackNumber: track.position,
        releaseId: track.release.id,
        releaseTitle: track.release.title,
        listenCount: track.listenCount,
        lyrics: track.lyrics,
        artworkUrl: track.release.artworkUrl
      }))

      const queue = queueGenerator.generateFromTracks(queueTracks, playlistData.playlist.name)
      const shuffledTracks = [...queue.tracks].sort(() => Math.random() - 0.5)
      queue.tracks = shuffledTracks
      queue.shuffled = true
      queue.originalSource = {
        type: 'shuffle_all',
        id: selectedPlaylist?.id || 'unknown',
        name: `${playlistData.playlist.name} (Shuffled)`
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
    if (!playlistData?.tracks) return

    try {
      const queueTracks = playlistData.tracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        fileUrl: t.fileUrl,
        duration: t.duration,
        trackNumber: t.position,
        releaseId: t.release.id,
        releaseTitle: t.release.title,
        listenCount: t.listenCount,
        lyrics: t.lyrics,
        artworkUrl: t.release.artworkUrl
      }))

      const queue = queueGenerator.generateFromTracks(queueTracks, playlistData.playlist.name)
      queue.originalSource = {
        type: 'playlist',
        id: selectedPlaylist?.id || 'unknown',
        name: playlistData.playlist.name
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

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div>Loading playlists...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: 'red' }}>{error}</div>
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
    return (
      <>
        <style jsx>{`
          .mobile-playlists {
            padding: 40px 0 0 0;
          }
          
          .playlist-list {
            list-style: none;
            padding: 0 15px;
            margin: 20px 0;
          }
          
          .playlist-item {
            padding: 12px 0;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
          }
          
          .playlist-item:hover {
            background-color: #f0f0f0;
          }
          
          .playlist-name {
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .playlist-meta {
            font-size: 14px;
            color: #666;
          }
          
          .back-link-button {
            background: none !important;
            border: none !important;
            color: #0066cc !important;
            text-decoration: underline !important;
            cursor: pointer !important;
            fontSize: 16px !important;
            padding: 0 !important;
            fontFamily: inherit !important;
            outline: none !important;
            boxShadow: none !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
          }
          
          .back-link-button:hover {
            background: #FFFF00 !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            color: #000 !important;
          }
          
          .back-link-button:active {
            background: #FFFF00 !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            color: #000 !important;
          }
        `}</style>
        
        <div className="mobile-playlists">
          {mobileView === 'playlists' ? (
            <>
              <h1 style={{ padding: '0 15px' }}>🎵 Your Playlists</h1>
              
              <div style={{ marginBottom: '20px', padding: '0 15px' }}>
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    padding: '8px 16px',
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
                  + New Playlist
                </button>
              </div>

              <ul className="playlist-list">
                {playlists.map((playlist) => (
                  <li 
                    key={playlist.id || 'liked-songs'}
                    className="playlist-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <div onClick={() => handlePlaylistSelect(playlist)} style={{ flex: 1, cursor: 'pointer' }}>
                      <div className="playlist-name">
                        {playlist.isSystem ? '♥' : '🎵'} {playlist.name}
                      </div>
                      <div className="playlist-meta">
                        {playlist.trackCount} song{playlist.trackCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {!playlist.isSystem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          showDeleteModal(playlist)
                        }}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#ddd',
                          color: '#000',
                          border: '1px outset #ccc',
                          cursor: 'pointer',
                          fontFamily: 'Courier New, monospace',
                          fontSize: '10px'
                        }}
                      >
                        🗑
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            // Track list view (reuse PlaylistView mobile styles)
            <div>
              <div style={{ marginBottom: '20px', padding: '0 15px' }}>
                <button 
                  className="back-link-button"
                  onClick={() => setMobileView('playlists')}
                >
                  ← Back to Playlists
                </button>
              </div>
              
              {playlistData && (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '15px', 
                    marginBottom: '20px',
                    alignItems: 'flex-start',
                    padding: '0 15px'
                  }}>
                    <div style={{ flexShrink: 0 }}>
                      {playlistData.tracks && playlistData.tracks.length > 0 ? (
                        <img
                          src={playlistData.tracks[0].release.artworkUrl || '/default-artwork.png'}
                          alt={`${playlistData.tracks[0].release.title} artwork`}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            border: '1px solid #ccc'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '80px',
                          height: '80px',
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ccc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px'
                        }}>
                          {selectedPlaylist?.isSystem ? '♡' : '🎵'}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h1 style={{ fontSize: '20px' }}>
                        {selectedPlaylist?.isSystem ? '♥' : '🎵'} {selectedPlaylist?.name}
                      </h1>
                      
                      <div style={{ 
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '15px'
                      }}>
                        <span>{selectedPlaylist?.trackCount || 0} song{(selectedPlaylist?.trackCount || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {playlistData.tracks && playlistData.tracks.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', padding: '0 15px' }}>
                      <button
                        onClick={shuffleAll}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#ddd',
                          color: '#000',
                          border: '2px outset #ccc',
                          cursor: 'pointer',
                          fontFamily: 'Courier New, monospace',
                          fontSize: '12px'
                        }}
                      >
                        &gt; Shuffle
                      </button>
                      
                      {selectedPlaylist?.id && (
                        <button
                          onClick={copyShareLink}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ddd',
                            color: '#000',
                            border: '2px outset #ccc',
                            cursor: 'pointer',
                            fontFamily: 'Courier New, monospace',
                            fontSize: '12px'
                          }}
                          title={linkCopied ? "Copied to clipboard!" : "Copy share link"}
                        >
                          {linkCopied ? '✅ Link Copied' : '📋 Share'}
                        </button>
                      )}
                    </div>
                  )}

                  {!playlistData.tracks || playlistData.tracks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 5px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {selectedPlaylist?.isSystem ? '♡' : '🎵'}
                      </div>
                      <h2>No songs in this playlist</h2>
                    </div>
                  ) : (
                    <table 
                      style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        fontFamily: 'Courier New, monospace',
                        border: 'none',
                        boxShadow: 'none',
                        margin: '0',
                        overflow: 'visible'
                      }}
                      onDrop={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                        e.preventDefault()
                        
                        // If we have valid drag data, perform the move
                        if (draggedIndex !== null && dropTarget) {
                          let finalPosition = dropTarget.index
                          if (dropTarget.position === 'after') {
                            finalPosition++
                          }
                          if (draggedIndex < finalPosition) {
                            finalPosition--
                          }
                          
                          moveTrack(draggedIndex, finalPosition)
                        }
                        
                        // Clear all interactive states
                        setDraggedIndex(null)
                        setDropTarget(null)
                        setHoveredTrackId(null)
                      } : undefined}
                      onDragOver={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                      } : undefined}
                    >
                      <thead>
                        <tr style={{ 
                          backgroundColor: '#e0e0e0'
                        }}>
                          {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && (
                            <th style={{ 
                              padding: '6px 2px', 
                              textAlign: 'center',
                              width: '20px',
                              border: 'none'
                            }}></th>
                          )}
                          <th style={{ 
                            padding: '6px 4px', 
                            textAlign: 'left',
                            border: 'none'
                          }}>Title</th>
                          <th style={{ 
                            padding: '6px 4px', 
                            textAlign: 'left',
                            border: 'none'
                          }}>Artist</th>
                          <th style={{ 
                            width: '60px', 
                            padding: '6px 4px', 
                            textAlign: 'center',
                            border: 'none'
                          }}>Time</th>
                          <th style={{ 
                            width: '30px', 
                            padding: '6px 4px', 
                            textAlign: 'center',
                            border: 'none'
                          }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {playlistData.tracks.map((track, index) => {
                          const isPlaying = queueAudio.currentTrack?.id === track.id
                          const isDragging = draggedIndex === index
                          const isAnimatingThisTrack = animatingTrackId === track.id
                          const showDropBefore = dropTarget?.index === index && dropTarget?.position === 'before'
                          const showDropAfter = dropTarget?.index === index && dropTarget?.position === 'after'
                          
                          // Use a more stable key during animation
                          const stableKey = isAnimatingThisTrack ? `animating-${track.id}` : track.id
                          
                          return (
                            <React.Fragment key={stableKey}>
                              {/* Drop indicator before */}
                              {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && showDropBefore && (
                                <tr>
                                  <td colSpan={4} style={{ padding: 0 }}>
                                    <div style={{
                                      height: '2px',
                                      backgroundColor: '#0066cc',
                                      margin: '2px 0'
                                    }} />
                                  </td>
                                </tr>
                              )}

                              <tr
                                data-track-id={track.id}
                                className={openMenuId === track.id ? 'menu-open-row' : ''}
                                onClick={() => playTrack(index)}
                                draggable={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && openMenuId !== track.id}
                                onDragStart={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                                  setDraggedIndex(index)
                                  setHoveredTrackId(null) // Clear hover state when drag starts
                                  e.dataTransfer.effectAllowed = 'move'
                                } : undefined}
                                onDragEnd={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? () => {
                                  // Force immediate clearing with flushSync
                                  flushSync(() => {
                                    setDraggedIndex(null)
                                    setDropTarget(null)
                                    setHoveredTrackId(null)
                                  })
                                } : undefined}
                                onDragOver={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  e.dataTransfer.dropEffect = 'move'
                                  if (draggedIndex === null || draggedIndex === index) return
                                  
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  const midY = rect.top + rect.height / 2
                                  const position = e.clientY < midY ? 'before' : 'after'
                                  
                                  setDropTarget({ index, position })
                                } : undefined}
                                onDragEnter={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                } : undefined}
                                onDrop={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  
                                  if (draggedIndex === null || !dropTarget) return
                                  
                                  let finalPosition = dropTarget.index
                                  if (dropTarget.position === 'after') {
                                    finalPosition++
                                  }
                                  if (draggedIndex < finalPosition) {
                                    finalPosition--
                                  }
                                  
                                  moveTrack(draggedIndex, finalPosition)
                                  
                                  // Immediately clear all interactive states
                                  setDraggedIndex(null)
                                  setDropTarget(null)
                                  setHoveredTrackId(null)
                                } : undefined}
                                style={{
                                  backgroundColor: isPlaying ? '#FFFF00' : (hoveredTrackId === track.id ? '#d0d0d0' : (index % 2 === 0 ? '#f9f9f9' : '#fff')),
                                  color: '#000',
                                  cursor: isDragging ? 'grabbing' : 'pointer',
                                  opacity: isDragging ? 0.5 : 1,
                                  userSelect: 'none',
                                  transform: isDragging ? 'translateX(-8px)' : 
                                             isAnimatingThisTrack ? `translateX(${animationOffset}px)` : 
                                             'translateX(0)',
                                  transition: isAnimatingThisTrack ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                                  position: 'relative',
                                  zIndex: isDragging ? 1000 : (openMenuId === track.id ? 10001 : 2),
                                }}
                                onMouseEnter={() => {
                                  if (!isPlaying && !isDragging && draggedIndex === null) {
                                    setHoveredTrackId(track.id)
                                  }
                                }}
                                onMouseLeave={() => {
                                  // Always clear hover state on mouse leave
                                  setHoveredTrackId(null)
                                }}
                              >
                              {/* Drag handle */}
                              {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && (
                                <td style={{ textAlign: 'center', padding: '6px 2px', border: 'none' }}>
                                  <div style={{
                                    color: '#999',
                                    fontSize: '14px',
                                    lineHeight: 1,
                                    cursor: 'grab',
                                    userSelect: 'none'
                                  }}>
                                    ⋮⋮
                                  </div>
                                </td>
                              )}
                              <td style={{ 
                                padding: '6px 4px', 
                                                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '120px'
                              }}>
                                {track.title}
                              </td>
                              <td style={{ 
                                padding: '6px 4px', 
                                                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '80px'
                              }}>
                                {track.artist}
                              </td>
                              <td style={{ 
                                textAlign: 'center', 
                                padding: '6px 4px', 
                                whiteSpace: 'nowrap',
                                border: 'none'
                              }}>
                                {track.duration ? formatTime(track.duration) : '—'}
                              </td>
                              <td 
                                className={openMenuId === track.id ? 'menu-open-cell' : ''} 
                                style={{ textAlign: 'center', padding: '6px 4px', position: 'relative', border: 'none' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <TrackActionMenu
                                  track={{
                                    id: track.id,
                                    title: track.title,
                                    artist: track.artist,
                                    fileUrl: track.fileUrl,
                                    duration: track.duration,
                                    lyrics: track.lyrics,
                                    position: track.position,
                                    release: track.release
                                  }}
                                  isOpen={openMenuId === track.id}
                                  onToggle={() => setOpenMenuId(openMenuId === track.id ? null : track.id)}
                                  onClose={() => setOpenMenuId(null)}
                                  context="playlist"
                                  onRefresh={onRefresh}
                                  showLikeAction={true}
                                  isLiked={selectedPlaylist?.isSystem}
                                  currentPlaylistId={selectedPlaylist?.id}
                                  showRemoveFromPlaylist={!selectedPlaylist?.isSystem && selectedPlaylist?.id !== null}
                                />
                              </td>
                            </tr>
                            {/* Drop indicator after */}
                            {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && showDropAfter && (
                              <tr>
                                <td colSpan={4} style={{ padding: 0 }}>
                                  <div style={{
                                    height: '2px',
                                    backgroundColor: '#0066cc',
                                    margin: '2px 0'
                                  }} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </>
    )
  }

  // Desktop view with sidebar
  return (
    <>
      {/* Modal for deleting playlists */}
      {showDeleteConfirm && playlistToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={cancelDelete}>
          <div style={{
            background: 'linear-gradient(145deg, #f0f0f0 0%, #d0d0d0 50%, #b8b8b8 100%)',
            border: '2px outset #ccc',
            padding: '0',
            minWidth: '400px',
            maxWidth: '500px',
            fontFamily: 'Courier New, monospace'
          }}
          onClick={(e) => e.stopPropagation()}>
            {/* Window title bar */}
            <div style={{
              background: 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)',
              borderBottom: '1px solid #000',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              <span>⚠ Delete Playlist</span>
              <div style={{
                width: '14px',
                height: '12px',
                background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)',
                border: '2px outset #d0d0d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '7px',
                cursor: 'pointer'
              }}
              onClick={cancelDelete}>×</div>
            </div>

            {/* Modal content */}
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                  Delete "{playlistToDelete.name}"?
                </div>
                <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                  Are you sure you want to delete this playlist? This action cannot be undone.
                  {playlistToDelete.trackCount > 0 && (
                    <><br />This playlist contains {playlistToDelete.trackCount} song{playlistToDelete.trackCount !== 1 ? 's' : ''}.</>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelDelete}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ddd',
                    color: '#000',
                    border: '2px outset #ccc',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '11px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
                  onMouseDown={(e) => e.currentTarget.style.border = '2px inset #ccc'}
                  onMouseUp={(e) => e.currentTarget.style.border = '2px outset #ccc'}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#cc0000',
                    color: '#fff',
                    border: '2px outset #ff4444',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#aa0000'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#cc0000'}
                  onMouseDown={(e) => e.currentTarget.style.border = '2px inset #ff4444'}
                  onMouseUp={(e) => e.currentTarget.style.border = '2px outset #ff4444'}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for creating playlists */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => {
          setShowCreateForm(false)
          setNewPlaylistName("")
          setNewPlaylistDescription("")
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #f0f0f0 0%, #d0d0d0 50%, #b8b8b8 100%)',
            border: '2px outset #ccc',
            padding: '0',
            minWidth: '300px',
            maxWidth: '90vw',
            fontFamily: 'Courier New, monospace'
          }}
          onClick={(e) => e.stopPropagation()}>
            {/* Modal title bar */}
            <div style={{
              background: 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)',
              borderBottom: '1px solid #000',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              <span>Create New Playlist</span>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewPlaylistName("")
                  setNewPlaylistDescription("")
                }}
                style={{
                  width: '16px',
                  height: '14px',
                  background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)',
                  border: '2px outset #d0d0d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  cursor: 'pointer',
                  color: '#000'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal content */}
            <div style={{ backgroundColor: '#f0f0f0', padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  Playlist Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPlaylistName.trim()) {
                      createPlaylist()
                    }
                    if (e.key === 'Escape') {
                      setShowCreateForm(false)
                      setNewPlaylistName("")
                      setNewPlaylistDescription("")
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '12px',
                    border: '2px inset #ccc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  Description (Optional):
                </label>
                <textarea
                  placeholder="Enter playlist description"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '12px',
                    border: '2px inset #ccc',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewPlaylistName("")
                    setNewPlaylistDescription("")
                  }}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#ddd',
                    color: '#000',
                    border: '2px outset #ccc',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '12px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
                  onMouseDown={(e) => e.currentTarget.style.border = '2px inset #ccc'}
                  onMouseUp={(e) => e.currentTarget.style.border = '2px outset #ccc'}
                >
                  Cancel
                </button>
                <button
                  onClick={createPlaylist}
                  disabled={!newPlaylistName.trim()}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: newPlaylistName.trim() ? '#ddd' : '#f0f0f0',
                    color: newPlaylistName.trim() ? '#000' : '#999',
                    border: '2px outset #ccc',
                    cursor: newPlaylistName.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (newPlaylistName.trim()) {
                      e.currentTarget.style.backgroundColor = '#bbb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newPlaylistName.trim()) {
                      e.currentTarget.style.backgroundColor = '#ddd'
                    }
                  }}
                  onMouseDown={(e) => {
                    if (newPlaylistName.trim()) {
                      e.currentTarget.style.border = '2px inset #ccc'
                    }
                  }}
                  onMouseUp={(e) => {
                    if (newPlaylistName.trim()) {
                      e.currentTarget.style.border = '2px outset #ccc'
                    }
                  }}
                >
                  Create Playlist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .desktop-playlists {
          background: #f8f8f8;
          padding-top: 40px;
          min-height: 100vh;
        }
        
        .track-row-no-hover {
          background-color: #fff !important;
        }
        
        .track-row-no-hover:hover {
          background-color: #fff !important;
        }
        
        .playlists-window {
          background: linear-gradient(145deg, #f0f0f0 0%, #d0d0d0 50%, #d0d0d0 100%);
          border: 1px solid #000;
          margin: 10px auto 0 auto;
          max-width: min(1000px, calc(100vw - 40px));
          box-sizing: border-box;
          overflow: visible;
          height: calc(100vh - 200px);
          max-height: calc(100vh - 200px);
          display: flex;
          flex-direction: column;
        }
        
        .window-title-bar {
          background: linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%);
          border-bottom: 1px solid #000;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        
        .window-controls {
          display: flex;
          gap: 4px;
        }
        
        .window-control {
          width: 14px;
          height: 12px;
          background: linear-gradient(145deg, #e0e0e0, #b0b0b0);
          border: 2px outset #d0d0d0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          cursor: pointer;
        }
        
        .window-content {
          background-color: #f0f0f0;
          display: flex;
          flex: 1;
          min-height: 0;
        }
        
        .sidebar {
          width: 200px;
          background: #e8e8e8;
          border-right: 1px solid #000;
          padding: 12px 8px;
        }
        
        .sidebar-title {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
          padding: 4px 6px;
          background: #d0d0d0;
          border: 1px inset #ccc;
        }
        
        .playlist-item {
          padding: 6px 8px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          border-bottom: 1px solid #ddd;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .playlist-item:hover {
          background-color: #d0d0d0;
        }
        
        .playlist-item.selected {
          background-color: #0066cc;
          color: white;
        }
        
        .playlist-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 12px 0 0 0;
          overflow: hidden;
        }
        
        .playlist-header {
          flex-shrink: 0;
          margin-bottom: 15px;
          padding: 0 12px;
        }
        
        .playlist-tracks-container {
          flex: 1;
          overflow: auto;
          min-height: 0;
          margin: 0;
          padding: 0;
        }
        
        .playlist-tracks-container table {
          width: 100%;
          margin: 0;
          border: none;
          box-sizing: border-box;
          table-layout: fixed;
        }
        
        .playlist-tracks-container tbody td {
          border: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .playlist-tracks-container tbody tr:first-child td {
          border-top: none !important;
        }
        
        .playlist-tracks-container tbody td:first-child {
          border-left: none !important;
        }
        
        .playlist-tracks-container tbody td:last-child {
          border-right: none !important;
        }
        
        .playlist-tracks-container tbody tr:last-child td {
          border-bottom: none !important;
          border-bottom-width: 0px !important;
          border-bottom-style: none !important;
        }
        
        .playlist-tracks-container thead {
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }
        
        .playlist-tracks-container thead tr {
          border: none !important;
          border-bottom: none !important;
        }
        
        .playlist-tracks-container thead th {
          background-color: #e0e0e0 !important;
          position: sticky !important;
          top: 0 !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        .playlist-tracks-container thead th:first-child {
          border: none !important;
          box-shadow: none !important;
        }
        
        .playlist-tracks-container thead th:last-child {
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
      
      <div className="desktop-playlists">
        <div className="playlists-window">
          {/* Window title bar */}
          <div className="window-title-bar">
            <span>🎵 Your Playlists</span>
            <div className="window-controls">
              <div className="window-control">-</div>
              <div className="window-control" style={{ fontSize: '8px' }}>□</div>
            </div>
          </div>

          {/* Window content */}
          <div className="window-content">
            {/* Sidebar */}
            <div className="sidebar">
              <div className="sidebar-title">Playlists</div>
              
              <div style={{ marginBottom: '10px', padding: '4px 8px' }}>
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ddd',
                    color: '#000',
                    border: '1px outset #ccc',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '10px',
                    width: '100%',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
                  onMouseDown={(e) => e.currentTarget.style.border = '1px inset #ccc'}
                  onMouseUp={(e) => e.currentTarget.style.border = '1px outset #ccc'}
                >
                  + New
                </button>
              </div>

              {playlists.map((playlist) => (
                <div
                  key={playlist.id || 'liked-songs'}
                  className={`playlist-item ${selectedPlaylist?.id === playlist.id ? 'selected' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div 
                    onClick={() => handlePlaylistSelect(playlist)}
                    title={playlist.name}
                    style={{ 
                      flex: 1, 
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {playlist.isSystem ? '♥' : '🎵'} {playlist.name}
                  </div>
                  {!playlist.isSystem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        showDeleteModal(playlist)
                      }}
                      style={{
                        padding: '1px 3px',
                        backgroundColor: '#ddd',
                        color: '#000',
                        border: '1px outset #ccc',
                        cursor: 'pointer',
                        fontFamily: 'Courier New, monospace',
                        fontSize: '8px',
                        marginLeft: '4px',
                        flexShrink: 0
                      }}
                      title="Delete playlist"
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="playlist-content">
              {!selectedPlaylist ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎵</div>
                  <h2>Select a playlist</h2>
                  <p style={{ color: '#666' }}>Choose a playlist from the sidebar to view its tracks</p>
                </div>
              ) : !playlistData ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div>Loading playlist...</div>
                </div>
              ) : (
                <>
                  {/* Playlist header - fixed */}
                  <div className="playlist-header">
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      marginBottom: '30px',
                      alignItems: 'flex-start'
                    }}>
                    <div style={{ flexShrink: 0 }}>
                      {playlistData.tracks && playlistData.tracks.length > 0 ? (
                        <img
                          src={playlistData.tracks[0].release.artworkUrl || '/default-artwork.png'}
                          alt={`${playlistData.tracks[0].release.title} artwork`}
                          style={{
                            width: '120px',
                            height: '120px',
                            objectFit: 'cover',
                            border: '1px solid #ccc'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '120px',
                          height: '120px',
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ccc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '48px'
                        }}>
                          {selectedPlaylist.isSystem ? '♡' : '🎵'}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '15px'
                      }}>
                        <span>{playlistData.playlist.trackCount || 0} song{(playlistData.playlist.trackCount || 0) !== 1 ? 's' : ''}</span>
                        {playlistData.tracks && playlistData.tracks.length > 0 && (
                          <>
                            <span> • </span>
                            <span>
                              {formatTime(playlistData.tracks.reduce((total, track) => 
                                total + (track.duration || 0), 0
                              ))}
                            </span>
                          </>
                        )}
                      </div>

                      {playlistData.tracks && playlistData.tracks.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                          <button
                            onClick={shuffleAll}
                            style={{
                              padding: '6px 8px',
                              backgroundColor: '#ddd',
                              color: '#000',
                              border: '2px outset #ccc',
                              cursor: 'pointer',
                              fontFamily: 'Courier New, monospace',
                              fontSize: '12px',
                              width: '130px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
                            onMouseDown={(e) => e.currentTarget.style.border = '2px inset #ccc'}
                            onMouseUp={(e) => e.currentTarget.style.border = '2px outset #ccc'}
                          >
                            &gt; Shuffle
                          </button>

                          {selectedPlaylist?.id && (
                            <button
                              onClick={copyShareLink}
                              style={{
                                padding: '6px 8px',
                                backgroundColor: '#ddd',
                                color: '#000',
                                border: '2px outset #ccc',
                                cursor: 'pointer',
                                fontFamily: 'Courier New, monospace',
                                fontSize: '12px',
                                width: '130px'
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
                  </div>
                  </div>

                  {/* Track list - scrollable */}
                  <div className="playlist-tracks-container">
                  {!playlistData.tracks || playlistData.tracks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 5px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {selectedPlaylist.isSystem ? '♡' : '🎵'}
                      </div>
                      <h2>No songs in this playlist</h2>
                      <p style={{ color: '#666', marginBottom: '20px' }}>
                        {selectedPlaylist.isSystem ? "Songs you like will appear here. Look for the ♡ heart icon next to tracks to add them!" : "This playlist is empty."}
                      </p>
                      {selectedPlaylist.isSystem && (
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
                    <table 
                      style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        fontFamily: 'Courier New, monospace',
                        border: 'none',
                        boxShadow: 'none',
                        margin: '0',
                        overflow: 'visible'
                      }}
                      onDrop={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                        e.preventDefault()
                        
                        // If we have valid drag data, perform the move
                        if (draggedIndex !== null && dropTarget) {
                          let finalPosition = dropTarget.index
                          if (dropTarget.position === 'after') {
                            finalPosition++
                          }
                          if (draggedIndex < finalPosition) {
                            finalPosition--
                          }
                          
                          moveTrack(draggedIndex, finalPosition)
                        }
                        
                        // Clear all interactive states
                        setDraggedIndex(null)
                        setDropTarget(null)
                        setHoveredTrackId(null)
                      } : undefined}
                      onDragOver={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                      } : undefined}
                    >
                      <thead>
                        <tr style={{ 
                          backgroundColor: '#e0e0e0'
                        }}>
                          {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && (
                            <th style={{ 
                              padding: '6px 2px', 
                              textAlign: 'center',
                              width: '20px',
                              border: 'none'
                            }}></th>
                          )}
                          <th style={{ 
                            padding: '6px 4px', 
                            textAlign: 'left',
                            border: 'none'
                          }}>Title</th>
                          <th style={{ 
                            padding: '6px 4px', 
                            textAlign: 'left',
                            border: 'none'
                          }}>Artist</th>
                          <th style={{ 
                            padding: '6px 4px', 
                            textAlign: 'left',
                            border: 'none'
                          }}>Album</th>
                          <th style={{ 
                            width: '60px', 
                            padding: '6px 4px', 
                            textAlign: 'center',
                            border: 'none'
                          }}>Time</th>
                          <th style={{ 
                            width: '30px', 
                            padding: '6px 4px', 
                            textAlign: 'center',
                            border: 'none'
                          }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {playlistData.tracks.map((track, index) => {
                          const isPlaying = queueAudio.currentTrack?.id === track.id
                          const isDragging = draggedIndex === index
                          const isAnimatingThisTrack = animatingTrackId === track.id
                          const showDropBefore = dropTarget?.index === index && dropTarget?.position === 'before'
                          const showDropAfter = dropTarget?.index === index && dropTarget?.position === 'after'
                          
                          // Use a more stable key during animation
                          const stableKey = isAnimatingThisTrack ? `animating-${track.id}` : track.id
                          
                          return (
                            <React.Fragment key={stableKey}>
                              {/* Drop indicator before */}
                              {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && showDropBefore && (
                                <tr>
                                  <td colSpan={4} style={{ padding: 0 }}>
                                    <div style={{
                                      height: '2px',
                                      backgroundColor: '#0066cc',
                                      margin: '2px 0'
                                    }} />
                                  </td>
                                </tr>
                              )}
                            <tr
                              key={track.id}
                              data-track-id={track.id}
                              className={openMenuId === track.id ? 'menu-open-row' : ''}
                              onClick={() => playTrack(index)}
                              draggable={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && openMenuId !== track.id}
                              onDragStart={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                                setDraggedIndex(index)
                                setHoveredTrackId(null) // Clear hover state when drag starts
                                e.dataTransfer.effectAllowed = 'move'
                              } : undefined}
                              onDragEnd={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? () => {
                                // Force immediate clearing with flushSync
                                flushSync(() => {
                                  setDraggedIndex(null)
                                  setDropTarget(null)
                                  setHoveredTrackId(null)
                                })
                              } : undefined}
                              onDragOver={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                e.dataTransfer.dropEffect = 'move'
                                if (draggedIndex === null || draggedIndex === index) return
                                
                                const rect = e.currentTarget.getBoundingClientRect()
                                const midY = rect.top + rect.height / 2
                                const position = e.clientY < midY ? 'before' : 'after'
                                
                                setDropTarget({ index, position })
                              } : undefined}
                              onDragEnter={!selectedPlaylist?.isSystem ? (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              } : undefined}
                              onDrop={(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") ? (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                
                                if (draggedIndex === null || !dropTarget) return
                                
                                let finalPosition = dropTarget.index
                                if (dropTarget.position === 'after') {
                                  finalPosition++
                                }
                                if (draggedIndex < finalPosition) {
                                  finalPosition--
                                }
                                
                                moveTrack(draggedIndex, finalPosition)
                                
                                // Immediately clear all interactive states
                                setDraggedIndex(null)
                                setDropTarget(null)
                                setHoveredTrackId(null)
                              } : undefined}
                              style={{
                                backgroundColor: isPlaying ? '#FFFF00' : (hoveredTrackId === track.id ? '#d0d0d0' : (index % 2 === 0 ? '#f9f9f9' : '#fff')),
                                color: '#000',
                                cursor: isDragging ? 'grabbing' : 'pointer',
                                opacity: isDragging ? 0.5 : 1,
                                userSelect: 'none',
                                transform: isDragging ? 'translateX(-8px)' : 
                                           isAnimatingThisTrack ? `translateX(${animationOffset}px)` : 
                                           'translateX(0)',
                                transition: isAnimatingThisTrack ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                                position: 'relative',
                                zIndex: isDragging ? 1000 : (openMenuId === track.id ? 10001 : 2)
                              }}
                              onMouseEnter={() => {
                                if (!isPlaying && !isDragging) {
                                  setHoveredTrackId(track.id)
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredTrackId(null)
                              }}
                            >
                              {/* Drag handle */}
                              {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && (
                                <td style={{ textAlign: 'center', padding: '6px 2px', border: 'none' }}>
                                  <div style={{
                                    color: '#999',
                                    fontSize: '14px',
                                    lineHeight: 1,
                                    cursor: 'grab',
                                    userSelect: 'none'
                                  }}>
                                    ⋮⋮
                                  </div>
                                </td>
                              )}
                              <td style={{ 
                                padding: '6px 4px', 
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '200px',
                                border: 'none'
                              }}>
                                {track.title}
                              </td>
                              <td style={{ 
                                padding: '6px 4px', 
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px',
                                border: 'none'
                              }}>
                                {track.artist}
                              </td>
                              <td style={{ 
                                padding: '6px 4px', 
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px',
                                border: 'none'
                              }}>
                                {track.release.title}
                              </td>
                              <td style={{ 
                                textAlign: 'center', 
                                padding: '6px 4px', 
                                whiteSpace: 'nowrap',
                                border: 'none'
                              }}>
                                {track.duration ? formatTime(track.duration) : '—'}
                              </td>
                              <td 
                                className={openMenuId === track.id ? 'menu-open-cell' : ''} 
                                style={{ textAlign: 'center', padding: '6px 4px', position: 'relative', border: 'none' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <TrackActionMenu
                                  track={{
                                    id: track.id,
                                    title: track.title,
                                    artist: track.artist,
                                    fileUrl: track.fileUrl,
                                    duration: track.duration,
                                    lyrics: track.lyrics,
                                    position: track.position,
                                    release: track.release
                                  }}
                                  isOpen={openMenuId === track.id}
                                  onToggle={() => setOpenMenuId(openMenuId === track.id ? null : track.id)}
                                  onClose={() => setOpenMenuId(null)}
                                  context="playlist"
                                  onRefresh={onRefresh}
                                  showLikeAction={true}
                                  isLiked={selectedPlaylist?.isSystem}
                                  currentPlaylistId={selectedPlaylist?.id}
                                  showRemoveFromPlaylist={!selectedPlaylist?.isSystem && selectedPlaylist?.id !== null}
                                />
                              </td>
                            </tr>

                            {/* Drop indicator after */}
                            {(!selectedPlaylist?.isSystem || selectedPlaylist?.name === "Liked Songs") && showDropAfter && (
                              <tr>
                                <td colSpan={4} style={{ padding: 0 }}>
                                  <div style={{
                                    height: '2px',
                                    backgroundColor: '#0066cc',
                                    margin: '2px 0'
                                  }} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                        })}
                      </tbody>
                    </table>
                  )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        body th, body td {
          border: none !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          border-bottom: none !important;
          box-shadow: none !important;
        }
        body table {
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  )
}