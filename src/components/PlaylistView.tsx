"use client"

import React, { useState, useEffect } from "react"
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
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>(data.tracks)
  const [animatingTrackId, setAnimatingTrackId] = useState<string | null>(null)
  const [animationOffset, setAnimationOffset] = useState<number>(0)

  // Sync local tracks with data prop
  useEffect(() => {
    setLocalTracks(data.tracks)
  }, [data.tracks])


  const moveTrack = async (fromIndex: number, toIndex: number) => {
    if (!localTracks || fromIndex === toIndex || !isOwned) return


    const movedTrack = localTracks[fromIndex]
    
    // Always slide in from the left (negative X offset)
    const leftOffset = -50
    
    // Start animation
    setAnimatingTrackId(movedTrack.id)
    setAnimationOffset(leftOffset)

    // Create new tracks array with reordered items
    const newTracks = [...localTracks]
    const [track] = newTracks.splice(fromIndex, 1)
    newTracks.splice(toIndex, 0, track)
    
    // Update positions
    const updatedTracks = newTracks.map((track, index) => ({
      ...track,
      position: index + 1
    }))

    // Update DOM immediately, then animate back to 0
    setLocalTracks(updatedTracks)
    
    // Reset animation after delay
    setTimeout(() => {
      setAnimationOffset(0)
      setTimeout(() => {
        setAnimatingTrackId(null)
      }, 600)
    }, 50)
    
    // Persist the new order to the server
    try {
      const trackUpdates = updatedTracks.map((track, index) => ({
        trackId: track.id,
        position: index + 1
      }))

      const response = await fetch(`/api/playlists/${data.playlist.id}/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackUpdates })
      })

      if (!response.ok) {
        console.error('Failed to persist track reordering')
        // Optionally revert the local changes or show an error message
      }
    } catch (error) {
      console.error('Error persisting track reordering:', error)
    }
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
    if (!localTracks || localTracks.length === 0) return

    try {
      const queueTracks = localTracks.map(track => ({
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
    if (!localTracks || localTracks.length === 0) return

    try {
      const queueTracks = localTracks.map(track => ({
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
      const queueTracks = localTracks.map(t => ({
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
    <>
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        table {
          box-shadow: none !important;
        }
        
        .desktop-playlist {
          display: block;
        }
        
        .mobile-playlist {
          display: none;
        }
        
        @media (max-width: 768px) {
          .desktop-playlist {
            display: none;
          }
          
          .mobile-playlist {
            display: block;
          }
          
          .mobile-playlist table {
            border: none !important;
          }
          
          .mobile-playlist table th:first-child,
          .mobile-playlist table td:first-child {
            border-left: none !important;
          }
          
          .mobile-playlist table th:last-child,
          .mobile-playlist table td:last-child {
            border-right: none !important;
          }
          
          .mobile-playlist table thead tr {
            border-bottom: 1px solid #000 !important;
          }
          
          .mobile-playlist table tbody tr {
            border-bottom: 1px solid #ddd !important;
          }
          
          .mobile-playlist table tbody tr[draggable="true"][style*="translateX(-8px)"] {
            transform: translateX(0) !important;
          }
          
          /* ULTRA NUCLEAR OPTION: Override ALL possible button styling on mobile */
          @media (max-width: 768px) {
            /* Target every possible selector combination for mobile playlist buttons */
            .mobile-playlist .track-action-menu button,
            .mobile-playlist .track-action-menu button:hover,
            .mobile-playlist .track-action-menu button:active,
            .mobile-playlist .track-action-menu button:focus,
            .mobile-playlist .track-action-menu button:visited,
            .mobile-playlist .track-action-menu button:link,
            div.mobile-playlist .track-action-menu button,
            div.mobile-playlist .track-action-menu button:hover,
            div.mobile-playlist .track-action-menu button:active,
            div.mobile-playlist .track-action-menu button:focus {
              border: none !important;
              border-top: none !important;
              border-bottom: none !important;
              border-left: none !important;
              border-right: none !important;
              border-style: none !important;
              border-width: 0 !important;
              border-color: transparent !important;
              box-shadow: none !important;
              outline: none !important;
              background-color: #e0e0e0 !important;
              padding: 2px 6px !important;
              font-size: 10px !important;
              font-family: 'Courier New', monospace !important;
              color: #000 !important;
              cursor: pointer !important;
              -webkit-appearance: none !important;
              -moz-appearance: none !important;
              appearance: none !important;
              -webkit-tap-highlight-color: transparent !important;
              transform: none !important;
              transition: none !important;
            }
            
            /* Hover state */
            .mobile-playlist .track-action-menu button:hover,
            div.mobile-playlist .track-action-menu button:hover {
              background-color: #ccc !important;
              border: none !important;
              box-shadow: none !important;
            }
            
            /* Active state - override the global !important active styling */
            .mobile-playlist .track-action-menu button:active,
            div.mobile-playlist .track-action-menu button:active {
              background-color: #ccc !important;
              border: none !important;
              border-style: none !important;
              border-width: 0 !important;
              box-shadow: none !important;
              transform: none !important;
            }
          }
          
          /* Still keep other mobile playlist buttons flat, but NOT playlist action buttons */
          .mobile-playlist button:not(.track-action-menu button):not(.playlist-action-button) {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }
          
          /* Fix dropdown positioning for both desktop and mobile */
          .menu-open-cell {
            z-index: 10001 !important;
            position: relative !important;
          }
          
          .menu-open-row {
            z-index: 10001 !important;
            position: relative !important;
          }
          
          /* Ensure table doesn't create stacking context issues */
          table {
            position: relative;
            z-index: 1;
          }
          
          /* Ensure all table rows have positioning context for z-index to work */
          table tbody tr {
            position: relative !important;
            z-index: 2;
          }
          
          /* Force consistent row height on mobile */
          @media (max-width: 768px) {
            .mobile-playlist table tbody tr {
              height: 26px !important;
              min-height: 26px !important;
              max-height: 26px !important;
            }
            
            .mobile-playlist table tbody td {
              height: 26px !important;
              line-height: 1.2 !important;
              vertical-align: middle !important;
            }
            
            .mobile-playlist table tbody td:not(:last-child) {
              overflow: hidden !important;
            }
            
            /* Remove h1 bottom margin in mobile playlist */
            .mobile-playlist h1 {
              margin-bottom: 0px !important;
            }
          }
          
          /* Menu open row gets highest priority */
          table tbody tr.menu-open-row {
            position: relative !important;
            z-index: 10001 !important;
          }
          
          /* Remove borders from desktop playlist table */
          .desktop-playlist-table {
            border: none !important;
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
          }
          
          /* Remove black outline from desktop track action menu button */
          .desktop-playlist .track-action-menu button,
          .desktop-playlist-table .track-action-menu button {
            border: none !important;
            border-top: none !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
            border-style: none !important;
            border-width: 0 !important;
          }
          
          .desktop-playlist-table th,
          .desktop-playlist-table td {
            border: 1px solid #808080 !important;
          }
          
          .desktop-playlist-table th {
            border-top: 1px solid #808080 !important;
            border-left: 1px solid #808080 !important;
            border-right: 1px solid #808080 !important;
            border-bottom: 1px solid #808080 !important;
          }
          
          /* Prevent cell content from wrapping */
          .desktop-playlist-table td,
          .desktop-playlist-table th {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          .mobile-playlist table {
            width: 100% !important;
            max-width: 100vw !important;
            table-layout: fixed !important;
          }
          
          .mobile-playlist table td,
          .mobile-playlist table th {
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
          }
          
          /* Only add overflow hidden to cells that don't contain action menus */
          .mobile-playlist table td:not(.menu-open-cell) {
            overflow: hidden !important;
          }
          
          .mobile-playlist table th {
            overflow: hidden !important;
          }
          
          /* Ensure mobile action menus appear above table rows */
          @media (max-width: 768px) {
            .mobile-playlist .menu-open-row {
              z-index: 10002 !important;
            }
            
            .mobile-playlist .menu-open-cell {
              z-index: 10002 !important;
            }
            
            .mobile-playlist .track-action-menu {
              z-index: 10003 !important;
              position: relative !important;
            }
            
            /* Flatten ALL mobile action menu buttons including dropdown items */
            .mobile-playlist .track-action-menu button,
            .mobile-playlist .track-action-menu div button {
              border: none !important;
              border-top: none !important;
              border-bottom: none !important;
              border-left: none !important;
              border-right: none !important;
              border-style: none !important;
              border-width: 0 !important;
              box-shadow: none !important;
              outline: none !important;
              -webkit-appearance: none !important;
              -moz-appearance: none !important;
              appearance: none !important;
            }
            
            .mobile-playlist .track-action-menu button:hover,
            .mobile-playlist .track-action-menu div button:hover {
              border: none !important;
              border-style: none !important;
              border-width: 0 !important;
              box-shadow: none !important;
              outline: none !important;
              background-color: #ccc !important;
            }
          }
        }
      `}</style>
      
      {/* Desktop Mac window view */}
      <div className="desktop-playlist" style={{ background: '#f8f8f8 !important', paddingTop: '40px' }}>
        <div style={{ 
          background: 'linear-gradient(145deg, #f0f0f0 0%, #d0d0d0 50%, #b8b8b8 100%)',
          border: '1px solid #000',
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: 'min(800px, calc(100vw - 20px))',
          boxSizing: 'border-box',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0',
          overflow: 'visible'
        }}>
          {/* Brushed steel window title bar */}
          <div style={{
            background: 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)',
            borderBottom: '1px solid #000',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold'
          }}>
            <span>♥ {data.playlist.name}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
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
              }}>-</div>
              <div style={{
                width: '14px',
                height: '12px',
                background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)',
                border: '2px outset #d0d0d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                cursor: 'pointer'
              }}>□</div>
            </div>
          </div>

          {/* Window content */}
          <div style={{ backgroundColor: '#f0f0f0', padding: '12px', overflow: 'visible' }}>
      {showBackLink && (
        <div style={{ marginBottom: '20px' }}>
          <Link href={showBackLink.href} style={{ color: '#0066cc', textDecoration: 'underline' }}>
            ← {showBackLink.text}
          </Link>
        </div>
      )}

      {/* Playlist Header */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '30px',
        alignItems: 'flex-start'
      }}>
        {/* Artwork */}
        <div style={{ flexShrink: 0 }}>
          {localTracks && localTracks.length > 0 ? (
            <img
              src={localTracks[0].release.artworkUrl || '/default-artwork.png'}
              alt={`${localTracks[0].release.title} artwork`}
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
              ♡
            </div>
          )}
        </div>

        {/* Playlist Info */}
        <div style={{ flex: 1 }}>
          {data.playlist.owner && !isOwned && (
            <p style={{ color: '#666', marginBottom: '8px', fontSize: '14px' }}>
              Shared by <strong>{data.playlist.owner.name || data.playlist.owner.username}</strong>
            </p>
          )}
          
          <div style={{ 
            fontSize: '14px',
            color: '#666',
            marginBottom: '15px'
          }}>
            <span>{data.playlist.trackCount || 0} song{(data.playlist.trackCount || 0) !== 1 ? 's' : ''}</span>
            {localTracks && localTracks.length > 0 && (
              <>
                <span> • </span>
                <span>
                  {formatTime(localTracks.reduce((total, track) => 
                    total + (track.duration || 0), 0
                  ))}
                </span>
              </>
            )}
          </div>

          {localTracks && localTracks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              <button
                onClick={shuffleAll}
                onTouchStart={(e) => e.currentTarget.blur()}
                onTouchEnd={(e) => setTimeout(() => e.currentTarget.blur(), 10)}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#ddd',
                  color: '#000',
                  border: '2px outset #ccc',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  outline: 'none',
                  width: '130px'
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
                    padding: '6px 8px',
                    backgroundColor: '#ddd',
                    color: '#000',
                    border: '2px outset #ccc',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '12px',
                    outline: 'none',
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

      {!localTracks || localTracks.length === 0 ? (
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
        <table 
          className="desktop-playlist-table"
          style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
            border: 'none',
            boxShadow: 'none',
            overflow: 'visible'
          }}
          onDrop={isOwned ? (e) => {
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
            
            // Clear drag state
            setDraggedIndex(null)
            setDropTarget(null)
          } : undefined}
          onDragOver={isOwned ? (e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          } : undefined}
        >
          <thead>
            <tr style={{ 
              backgroundColor: '#e0e0e0',
              borderBottom: '1px solid #000'
            }}>
              {isOwned && <th style={{ width: '20px', padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #000' }}></th>}
              <th style={{ padding: '6px 4px', textAlign: 'left', borderRight: '1px solid #000' }}>Title</th>
              <th style={{ padding: '6px 4px', textAlign: 'left', borderRight: '1px solid #000' }}>Artist</th>
              <th style={{ padding: '6px 4px', textAlign: 'left', borderRight: '1px solid #000' }}>Album</th>
              <th style={{ width: '60px', padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #000' }}>Time</th>
              {isOwned && <th style={{ width: '30px', padding: '6px 4px', textAlign: 'center' }}></th>}
            </tr>
          </thead>
          <tbody>
            {localTracks.map((track, index) => {
              const isPlaying = queueAudio.currentTrack?.id === track.id
              const isDragging = draggedIndex === index
              const isAnimatingThisTrack = animatingTrackId === track.id
              const showDropBefore = dropTarget?.index === index && dropTarget?.position === 'before'
              const showDropAfter = dropTarget?.index === index && dropTarget?.position === 'after'
              
              return (
                <React.Fragment key={track.id}>
                  {/* Drop indicator before */}
                  {isOwned && showDropBefore && (
                    <tr>
                      <td colSpan={isOwned ? 6 : 4} style={{ padding: 0 }}>
                        <div style={{
                          height: '2px',
                          backgroundColor: '#0066cc',
                          margin: '2px 0'
                        }} />
                      </td>
                    </tr>
                  )}

                  <tr
                    className={openMenuId === track.id ? 'menu-open-row' : ''}
                    draggable={isOwned && openMenuId !== track.id}
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
                      e.stopPropagation()
                      e.dataTransfer.dropEffect = 'move'
                      if (draggedIndex === null || draggedIndex === index) return
                      
                      const rect = e.currentTarget.getBoundingClientRect()
                      const midY = rect.top + rect.height / 2
                      const position = e.clientY < midY ? 'before' : 'after'
                      
                      setDropTarget({ index, position })
                    } : undefined}
                    onDragEnter={isOwned ? (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    } : undefined}
                    onDrop={isOwned ? (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      
                      if (draggedIndex === null || !dropTarget) return
                      
                      // Calculate final position based on where the blue line appears
                      let finalPosition = dropTarget.index
                      if (dropTarget.position === 'after') {
                        finalPosition++
                      }
                      
                      // If we're moving an item down, we need to account for its removal
                      if (draggedIndex < finalPosition) {
                        finalPosition--
                      }
                      
                      moveTrack(draggedIndex, finalPosition)
                    } : undefined}
                    onClick={() => playTrack(index)}
                    style={{
                      backgroundColor: isPlaying ? '#000' : '#fff',
                      color: isPlaying ? '#fff' : '#000',
                      cursor: isDragging ? 'grabbing' : 'pointer',
                      opacity: isDragging ? 0.5 : 1,
                      userSelect: 'none',
                      transform: isDragging ? 'translateX(-8px)' : 
                                 isAnimatingThisTrack ? `translateX(${animationOffset}px)` : 
                                 'translateX(0)',
                      transition: isAnimatingThisTrack ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : isDragging ? 'none' : 'all 0.2s ease-out',
                      position: 'relative',
                      zIndex: isDragging ? 1000 : (openMenuId === track.id ? 10001 : 2),
                      borderBottom: '1px solid #000'
                    }}
                    onMouseEnter={(e) => {
                      if (!isPlaying) {
                        e.currentTarget.style.backgroundColor = '#d0d0d0'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isPlaying) {
                        e.currentTarget.style.backgroundColor = '#fff'
                      }
                    }}
                  >
                    {/* Drag handle */}
                    {isOwned && (
                      <td style={{ textAlign: 'center', padding: '6px 4px', borderRight: '1px solid #000' }}>
                        <div style={{
                          color: isPlaying ? '#fff' : '#666',
                          fontSize: '10px',
                          cursor: 'grab',
                          userSelect: 'none'
                        }}>
                          ⋮⋮
                        </div>
                      </td>
                    )}
                    
                    {/* Title */}
                    <td 
                      style={{ padding: '6px 4px', borderRight: '1px solid #000', fontWeight: isPlaying ? 'bold' : 'normal', color: isPlaying ? '#fff' : '#000' }}
                      onDrop={isOwned ? (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (draggedIndex !== null && dropTarget) {
                          let finalPosition = dropTarget.index
                          if (dropTarget.position === 'after') finalPosition++
                          if (draggedIndex < finalPosition) finalPosition--
                          moveTrack(draggedIndex, finalPosition)
                        }
                      } : undefined}
                    >
                      {track.title}
                    </td>
                    
                    {/* Artist */}
                    <td style={{ padding: '6px 4px', borderRight: '1px solid #000', color: isPlaying ? '#fff' : '#000', fontWeight: isPlaying ? 'bold' : 'normal' }}>
                      {track.artist}
                    </td>
                    
                    {/* Album */}
                    <td style={{ padding: '6px 4px', borderRight: '1px solid #000', color: isPlaying ? '#fff' : '#000', fontWeight: isPlaying ? 'bold' : 'normal' }}>
                      {track.release.title}
                    </td>
                    
                    {/* Duration */}
                    <td style={{ textAlign: 'center', padding: '6px 4px', borderRight: '1px solid #000', color: isPlaying ? '#fff' : '#000', fontWeight: isPlaying ? 'bold' : 'normal' }}>
                      {track.duration ? formatTime(track.duration) : '—'}
                    </td>
                    
                    {/* Action menu */}
                    {isOwned && (
                      <td 
                        className={openMenuId === track.id ? 'menu-open-cell' : ''} 
                        style={{ textAlign: 'center', padding: '6px 4px', position: 'relative' }}
                        onDragStart={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                        }}
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
                          isLiked={true}
                        />
                      </td>
                    )}
                  </tr>

                  {/* Drop indicator after */}
                  {isOwned && showDropAfter && (
                    <tr>
                      <td colSpan={isOwned ? 6 : 4} style={{ padding: 0 }}>
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
        </div>
      </div>
      
      {/* Mobile simple view */}
      <div className="mobile-playlist" style={{ padding: '40px 0 0 0' }}>
        {showBackLink && (
          <div style={{ marginBottom: '20px', padding: '0 20px' }}>
            <Link href={showBackLink.href} style={{ color: '#0066cc', textDecoration: 'underline' }}>
              ← {showBackLink.text}
            </Link>
          </div>
        )}

        <div style={{ 
          backgroundColor: 'transparent',
          border: 'none',
          margin: '0 0 20px 0',
          padding: '20px'
        }}>
          {/* Mobile Header with Album Art */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            marginBottom: '20px',
            alignItems: 'flex-start'
          }}>
            {/* Artwork */}
            <div style={{ flexShrink: 0 }}>
              {localTracks && localTracks.length > 0 ? (
                <img
                  src={localTracks[0].release.artworkUrl || '/default-artwork.png'}
                  alt={`${localTracks[0].release.title} artwork`}
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
                  ♡
                </div>
              )}
            </div>

            {/* Playlist Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: '20px' }}>♥ {data.playlist.name}</h1>
              
              <div style={{ 
                fontSize: '14px',
                color: '#666',
                marginBottom: '15px'
              }}>
                <span>{data.playlist.trackCount || 0} song{(data.playlist.trackCount || 0) !== 1 ? 's' : ''}</span>
                {localTracks && localTracks.length > 0 && (
                  <>
                    <span> • </span>
                    <span>
                      {formatTime(localTracks.reduce((total, track) => 
                        total + (track.duration || 0), 0
                      ))}
                    </span>
                  </>
                )}
              </div>
              
              {data.playlist.owner && !isOwned && (
                <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                  Shared by <strong>{data.playlist.owner.name || data.playlist.owner.username}</strong>
                </p>
              )}

            </div>
          </div>

          {/* Action buttons below, aligned with artwork */}
          {localTracks && localTracks.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="playlist-action-button"
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
                  className="playlist-action-button"
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

        {/* Mobile track list - same table as desktop */}
        {!localTracks || localTracks.length === 0 ? (
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
          <div style={{ margin: '0' }}>
            <table 
              style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '12px',
                fontFamily: 'Courier New, monospace',
                border: '1px solid #000',
                boxShadow: 'none',
                overflow: 'visible'
              }}
              onDrop={isOwned ? (e) => {
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
                
                // Clear drag state
                setDraggedIndex(null)
                setDropTarget(null)
              } : undefined}
              onDragOver={isOwned ? (e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              } : undefined}
            >
              <thead>
                <tr style={{ 
                  backgroundColor: '#e0e0e0',
                  borderBottom: '1px solid #000'
                }}>
                  {isOwned && <th style={{ width: '20px', padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #000' }}></th>}
                  <th style={{ padding: '6px 4px', textAlign: 'left', borderRight: '1px solid #000' }}>Title</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left', borderRight: '1px solid #000' }}>Artist</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left', borderRight: '1px solid #000' }}>Album</th>
                  <th style={{ width: '60px', padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #000' }}>Time</th>
                  {isOwned && <th style={{ width: '30px', padding: '6px 4px', textAlign: 'center' }}></th>}
                </tr>
              </thead>
              <tbody>
                {localTracks.map((track, index) => {
                  const isPlaying = queueAudio.currentTrack?.id === track.id
                  const isDragging = draggedIndex === index
                  const isAnimatingThisTrack = animatingTrackId === track.id
                  const showDropBefore = dropTarget?.index === index && dropTarget?.position === 'before'
                  const showDropAfter = dropTarget?.index === index && dropTarget?.position === 'after'
                  
                  return (
                    <React.Fragment key={track.id}>
                      {/* Drop indicator before */}
                      {isOwned && showDropBefore && (
                        <tr>
                          <td colSpan={isOwned ? 6 : 4} style={{ padding: 0 }}>
                            <div style={{ 
                              height: '2px', 
                              backgroundColor: '#0066ff',
                              margin: '1px 0'
                            }}></div>
                          </td>
                        </tr>
                      )}
                      
                      <tr
                        className={openMenuId === track.id ? 'menu-open-row' : ''}
                        draggable={isOwned && openMenuId !== track.id}
                        onDragStart={isOwned ? (e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          setDraggedIndex(index)
                        } : undefined}
                        onDragEnd={isOwned ? () => {
                          setDraggedIndex(null)
                          setDropTarget(null)
                        } : undefined}
                        onDragOver={isOwned ? (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          
                          const rect = e.currentTarget.getBoundingClientRect()
                          const midY = rect.top + rect.height / 2
                          const position = e.clientY < midY ? 'before' : 'after'
                          
                          setDropTarget({ index, position })
                        } : undefined}
                        onClick={() => playTrack(index)}
                        style={{
                          backgroundColor: isPlaying ? '#000' : '#fff',
                          color: isPlaying ? '#fff' : '#000',
                          cursor: isDragging ? 'grabbing' : 'pointer',
                          opacity: isDragging ? 0.5 : 1,
                          userSelect: 'none',
                          transform: isDragging ? 'translateX(-8px)' : 
                                     isAnimatingThisTrack ? `translateX(${animationOffset}px)` : 
                                     'translateX(0)',
                          transition: isAnimatingThisTrack ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : isDragging ? 'none' : 'all 0.2s ease-out',
                          position: 'relative',
                          zIndex: isDragging ? 1000 : (openMenuId === track.id ? 10001 : 2),
                          borderBottom: '1px solid #000'
                        }}
                        onMouseEnter={(e) => {
                          if (!isPlaying) {
                            e.currentTarget.style.backgroundColor = '#d0d0d0'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isPlaying) {
                            e.currentTarget.style.backgroundColor = '#fff'
                          }
                        }}
                      >
                        {/* Drag handle */}
                        {isOwned && (
                          <td style={{ textAlign: 'center', padding: '6px 4px', borderRight: '1px solid #000' }}>
                            <div style={{
                              color: isPlaying ? '#fff' : '#666',
                              fontSize: '10px',
                              cursor: 'grab',
                              userSelect: 'none'
                            }}>
                              ⋮⋮
                            </div>
                          </td>
                        )}
                        
                        {/* Title */}
                        <td 
                          style={{ padding: '6px 4px', borderRight: '1px solid #000', fontWeight: isPlaying ? 'bold' : 'normal', color: isPlaying ? '#fff' : '#000' }}
                          onDrop={isOwned ? (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (draggedIndex !== null && dropTarget) {
                              let finalPosition = dropTarget.index
                              if (dropTarget.position === 'after') finalPosition++
                              if (draggedIndex < finalPosition) finalPosition--
                              moveTrack(draggedIndex, finalPosition)
                            }
                          } : undefined}
                        >
                          {track.title}
                        </td>
                        
                        {/* Artist */}
                        <td style={{ padding: '6px 4px', borderRight: '1px solid #000', color: isPlaying ? '#fff' : '#000', fontWeight: isPlaying ? 'bold' : 'normal' }}>
                          {track.artist}
                        </td>
                        
                        {/* Album */}
                        <td style={{ padding: '6px 4px', borderRight: '1px solid #000', color: isPlaying ? '#fff' : '#000', fontWeight: isPlaying ? 'bold' : 'normal' }}>
                          {track.release.title}
                        </td>
                        
                        {/* Duration */}
                        <td style={{ textAlign: 'center', padding: '6px 4px', borderRight: '1px solid #000', color: isPlaying ? '#fff' : '#000', fontWeight: isPlaying ? 'bold' : 'normal' }}>
                          {track.duration ? formatTime(track.duration) : '—'}
                        </td>
                        
                        {/* Action menu */}
                        {isOwned && (
                          <td 
                            className={openMenuId === track.id ? 'menu-open-cell' : ''} 
                            style={{ textAlign: 'center', padding: '6px 4px', position: 'relative' }}
                            onDragStart={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                            }}
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
                              isLiked={true}
                            />
                          </td>
                        )}
                      </tr>

                      {/* Drop indicator after */}
                      {isOwned && showDropAfter && (
                        <tr>
                          <td colSpan={isOwned ? 6 : 4} style={{ padding: 0 }}>
                            <div style={{ 
                              height: '2px', 
                              backgroundColor: '#0066ff',
                              margin: '1px 0'
                            }}></div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}