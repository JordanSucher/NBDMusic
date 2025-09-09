"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"
import { createReleaseUrl } from "@/utils/slugify"

export default function NowPlayingBar() {
  const queueAudio = useQueueAudioContext()
  const [showQueue, setShowQueue] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ index: number, position: 'before' | 'after' } | null>(null)

  // Keyboard shortcut to close queue modal
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showQueue && e.key === 'Escape') {
        setShowQueue(false)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [showQueue])
  
  // Use queue-based audio for everything
  const activeTrack = queueAudio.currentTrack ? {
    src: queueAudio.currentTrack.fileUrl,
    title: `${queueAudio.currentTrack.trackNumber}. ${queueAudio.currentTrack.title}`,
    artist: queueAudio.currentTrack.artist,
    releaseId: queueAudio.currentTrack.releaseId,
    trackIndex: queueAudio.currentQueue?.currentIndex || 0,
    playerId: `queue-player`
  } : null
  
  const isGloballyPlaying = queueAudio.isGloballyPlaying
  const currentTime = queueAudio.currentTime
  const duration = queueAudio.duration
  
  const hasNextTrack = queueAudio.currentQueue ? 
    (queueAudio.currentQueue.currentIndex < queueAudio.currentQueue.tracks.length - 1 || queueAudio.currentQueue.repeatMode === 'queue') :
    false
    
  const hasPrevTrack = queueAudio.currentQueue ?
    (queueAudio.currentQueue.currentIndex > 0 || queueAudio.currentQueue.repeatMode === 'queue') :
    false
  
  const togglePlayPause = queueAudio.togglePlayPause
  const nextTrack = queueAudio.nextTrack
  const prevTrack = queueAudio.prevTrack
  const seekToTime = queueAudio.seekToTime

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      
      if (!activeTrack || isInputFocused) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlayPause()
          break
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            prevTrack()
          }
          break
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            nextTrack()
          }
          break
        // Additional shortcuts
        case 'KeyJ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            prevTrack()
          }
          break
        case 'KeyK':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            nextTrack()
          }
          break
        // Media keys (these might not work on all systems)
        case 'MediaPlayPause':
          e.preventDefault()
          togglePlayPause()
          break
        case 'MediaNextTrack':
          e.preventDefault()
          nextTrack()
          break
        case 'MediaPreviousTrack':
          e.preventDefault()
          prevTrack()
          break
        case 'MediaStop':
          e.preventDefault()
          queueAudio.clearQueue()
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [activeTrack, togglePlayPause, nextTrack, prevTrack, queueAudio])

  // Don't render if no track is loaded
  if (!activeTrack) {
    return null
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('🎯 Progress bar clicked - target:', e.target, 'currentTarget:', e.currentTarget)
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    
    if (!duration) return
    
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    
    console.log('🎯 Progress bar seeking to', newTime)
    seekToTime(newTime)
  }

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only handle touchend to avoid multiple calls during drag
    if (e.type !== 'touchend') return
    
    console.log('📱 Progress bar touched - target:', e.target, 'currentTarget:', e.currentTarget)
    e.preventDefault()
    e.stopPropagation()
    
    if (!duration) return
    
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const touch = e.changedTouches[0] // Use changedTouches for touchend
    const touchX = touch.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, touchX / rect.width)) // Clamp between 0 and 1
    const newTime = percentage * duration
    
    console.log('📱 Progress bar seeking to', newTime)
    
    // Add a small delay to ensure touch events are fully processed
    setTimeout(() => {
      seekToTime(newTime)
    }, 10)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      zIndex: 200,
      borderTop: '1px solid #ccc',
      backgroundColor: '#ffffff'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '12px 20px',
        fontFamily: 'Courier New, monospace',
        fontSize: '11px'
      }}>
        {/* Mobile: Two column layout */}
        <div className="mobile-now-playing" style={{ 
          display: 'none',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '8px'
        }}>
          {/* Left column: Track and artist info */}
          <div style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            {/* Song name */}
            <div style={{
              fontSize: '14px',
              lineHeight: '1.2'
            }}>
              <Link 
                href={createReleaseUrl(activeTrack.releaseId, queueAudio.currentTrack?.title || '', queueAudio.currentTrack?.artist || '')}
                style={{
                  fontWeight: 'bold', 
                  color: '#0000EE',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '14px',
                  display: 'inline-block',
                  maxWidth: '100%',
                  width: 'fit-content'
                }}
                title={activeTrack.title.replace(/^\d+\.\s*/, '')}
              >
                {activeTrack.title.replace(/^\d+\.\s*/, '')}
              </Link>
            </div>

            {/* Artist name */}
            <div style={{
              fontSize: '12px',
              lineHeight: '1.2',
              color: '#666'
            }}>
              <span style={{ marginRight: '4px' }}>by</span>
              <Link 
                href={`/user/${activeTrack.artist}`}
                style={{
                  color: '#0000EE',
                  textDecoration: 'underline',
                  fontSize: '12px'
                }}
                title={activeTrack.artist}
              >
                {activeTrack.artist}
              </Link>
            </div>
          </div>

          {/* Right column: Queue + Shuffle indicators */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
            flexShrink: 0
          }}>
            {/* Queue link */}
            {queueAudio.currentQueue && (
              <span
                onClick={() => setShowQueue(true)}
                style={{
                  color: '#0000ff',
                  textDecoration: 'underline',
                  fontSize: '12px',
                  fontFamily: 'Courier New, monospace',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'black'
                  e.currentTarget.style.backgroundColor = '#ffff00'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#0000ff'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title={`View queue (${queueAudio.currentQueue.tracks.length - queueAudio.currentQueue.currentIndex - 1} remaining)`}
              >
                Queue ({queueAudio.currentQueue.tracks.length - queueAudio.currentQueue.currentIndex - 1})
              </span>
            )}
            
            {/* Shuffle indicator */}
            {queueAudio.currentQueue?.originalSource?.type === 'shuffle_all' && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#e6f3ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: '3px',
                  color: '#0066cc',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
                title="Shuffle All mode"
              >
                shuffle
              </span>
            )}
          </div>
        </div>

        {/* Desktop: Two column layout */}
        <div className="desktop-now-playing" style={{ 
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '8px'
        }}>
          {/* Left column: Track and artist info */}
          <div style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            {/* Song name */}
            <div style={{
              fontSize: '14px',
              lineHeight: '1.2'
            }}>
              <Link 
                href={createReleaseUrl(activeTrack.releaseId, queueAudio.currentTrack?.title || '', queueAudio.currentTrack?.artist || '')}
                style={{
                  fontWeight: 'bold', 
                  color: '#0000EE',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '14px',
                  display: 'inline-block',
                  maxWidth: '100%',
                  width: 'fit-content'
                }}
                title={activeTrack.title.replace(/^\d+\.\s*/, '')}
              >
                {activeTrack.title.replace(/^\d+\.\s*/, '')}
              </Link>
            </div>

            {/* Artist name */}
            <div style={{
              fontSize: '12px',
              lineHeight: '1.2',
              color: '#666'
            }}>
              <span style={{ marginRight: '4px' }}>by</span>
              <Link 
                href={`/user/${activeTrack.artist}`}
                style={{
                  color: '#0000EE',
                  textDecoration: 'underline',
                  fontSize: '12px'
                }}
                title={activeTrack.artist}
              >
                {activeTrack.artist}
              </Link>
            </div>
          </div>

          {/* Right column: Queue + Shuffle indicators */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
            flexShrink: 0
          }}>
            {/* Queue link */}
            {queueAudio.currentQueue && (
              <span
                onClick={() => setShowQueue(true)}
                style={{
                  color: '#0000ff',
                  textDecoration: 'underline',
                  fontSize: '12px',
                  fontFamily: 'Courier New, monospace',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'black'
                  e.currentTarget.style.backgroundColor = '#ffff00'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#0000ff'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title={`View queue (${queueAudio.currentQueue.tracks.length - queueAudio.currentQueue.currentIndex - 1} remaining)`}
              >
                Queue ({queueAudio.currentQueue.tracks.length - queueAudio.currentQueue.currentIndex - 1})
              </span>
            )}
            
            {/* Shuffle indicator */}
            {queueAudio.currentQueue?.originalSource?.type === 'shuffle_all' && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#e6f3ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: '3px',
                  color: '#0066cc',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
                title="Shuffle All mode"
              >
                shuffle
              </span>
            )}
          </div>
        </div>

        {/* Fourth line: Controls and progress bar */}
        <div className="controls-bar" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {/* Previous button */}
          <button
            onClick={prevTrack}
            disabled={!hasPrevTrack}
            onTouchEnd={(e) => e.currentTarget.blur()}
            style={{
              background: 'none !important',
              border: 'none !important',
              fontSize: '8px !important',
              color: hasPrevTrack ? '#000 !important' : '#ccc !important',
              cursor: hasPrevTrack ? 'pointer' : 'not-allowed',
              fontFamily: 'Courier New, monospace !important',
              padding: '0 !important',
              margin: '0 !important',
              lineHeight: '1',
              outline: 'none'
            }}
            title="Previous track"
          >
            {'<<'}
          </button>

          {/* Play/pause button */}
          <button
            onClick={togglePlayPause}
            onTouchEnd={(e) => e.currentTarget.blur()}
            style={{
              background: 'none !important',
              border: 'none !important',
              fontSize: '8px !important',
              color: '#000 !important',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace !important',
              padding: '0 !important',
              margin: '0 2px !important',
              lineHeight: '1',
              outline: 'none'
            }}
            title={isGloballyPlaying ? 'Pause' : 'Play'}
          >
            {isGloballyPlaying ? '||' : '>'}
          </button>

          {/* Next button */}
          <button
            onClick={nextTrack}
            disabled={!hasNextTrack}
            onTouchEnd={(e) => e.currentTarget.blur()}
            style={{
              background: 'none !important',
              border: 'none !important',
              fontSize: '8px !important',
              color: hasNextTrack ? '#000 !important' : '#ccc !important',
              cursor: hasNextTrack ? 'pointer' : 'not-allowed',
              fontFamily: 'Courier New, monospace !important',
              padding: '0 !important',
              margin: '0 !important',
              lineHeight: '1',
              outline: 'none'
            }}
            title="Next track"
          >
            {'>>'}
          </button>
          
          {/* Progress Bar */}
          <div 
            onClick={handleProgressClick}
            onTouchEnd={handleProgressTouch}
            className="subtle-dither"
            style={{
              height: '16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ccc',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '2px',
              flex: 1,
              marginLeft: '8px'
            }}
          >
            <div
              className="elegant-dither"
              style={{
                height: '100%',
                width: `${progressPercentage}%`,
                backgroundColor: '#666',
                transition: 'width 0.1s ease',
                pointerEvents: 'none'
              }}
            />
            
            {/* Vertical tick marks */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 9px)',
                pointerEvents: 'none'
              }}
            />
          </div>
          
          {/* Time display */}
          <span style={{ 
            color: '#666', 
            fontSize: '10px',
            whiteSpace: 'nowrap',
            marginLeft: '8px'
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Queue Modal */}
      {showQueue && queueAudio.currentQueue && (
        <div 
          onClick={() => setShowQueue(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="queue-modal"
            style={{
              backgroundColor: 'white',
              border: '2px solid #000',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              fontFamily: 'Courier New, monospace',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid #ccc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}>
                Queue ({queueAudio.currentQueue.tracks.length - queueAudio.currentQueue.currentIndex - 1} remaining)
              </h3>
              <button
                onClick={() => setShowQueue(false)}
                style={{
                  width: '24px',
                  height: '24px',
                  background: '#f5f5f5',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666',
                  lineHeight: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0'
                  e.currentTarget.style.borderColor = '#999'
                  e.currentTarget.style.color = '#000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                  e.currentTarget.style.borderColor = '#ccc'
                  e.currentTarget.style.color = '#666'
                }}
                title="Close queue"
              >
                ✕
              </button>
            </div>

            {/* Queue info */}
            {queueAudio.currentQueue.originalSource && (
              <div style={{
                padding: '10px 20px',
                backgroundColor: '#f8f8f8',
                borderBottom: '1px solid #eee',
                fontSize: '12px',
                color: '#666'
              }}>
                {queueAudio.currentQueue.originalSource.type === 'shuffle_all' && (
                  <span>Shuffled from all tracks</span>
                )}
                {queueAudio.currentQueue.originalSource.type === 'release' && (
                  <span>🎵 Playing from release</span>
                )}
              </div>
            )}

            {/* Track list */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '0'
            }}>
              {queueAudio.currentQueue.tracks.map((track, index) => {
                const isCurrentTrack = index === queueAudio.currentQueue?.currentIndex
                const isAlreadyPlayed = index < (queueAudio.currentQueue?.currentIndex || 0)
                const canRemove = queueAudio.currentQueue!.tracks.length > 1 && !isCurrentTrack
                const isDragging = draggedIndex === index
                const showDropBefore = dropTarget?.index === index && dropTarget?.position === 'before'
                const showDropAfter = dropTarget?.index === index && dropTarget?.position === 'after'
                
                return (
                  <div key={`${track.id}-${index}`} style={{ position: 'relative' }}>
                    {/* Drop indicator before */}
                    {showDropBefore && (
                      <div style={{
                        height: '3px',
                        backgroundColor: '#0066cc',
                        margin: '0 12px',
                        borderRadius: '1px',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '-3px',
                          top: '-2px',
                          width: '6px',
                          height: '6px',
                          backgroundColor: '#0066cc',
                          borderRadius: '50%'
                        }} />
                      </div>
                    )}
                    
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        setDraggedIndex(index)
                        e.dataTransfer.effectAllowed = 'move'
                        // Set a custom drag image
                        const dragImage = document.createElement('div')
                        dragImage.textContent = track.title
                        dragImage.style.position = 'absolute'
                        dragImage.style.top = '-1000px'
                        dragImage.style.backgroundColor = '#f0f0f0'
                        dragImage.style.padding = '4px 8px'
                        dragImage.style.border = '1px solid #ccc'
                        dragImage.style.fontFamily = 'Courier New, monospace'
                        dragImage.style.fontSize = '12px'
                        document.body.appendChild(dragImage)
                        e.dataTransfer.setDragImage(dragImage, 0, 0)
                        setTimeout(() => document.body.removeChild(dragImage), 0)
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null)
                        setDropTarget(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        
                        if (draggedIndex !== null && draggedIndex !== index) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const y = e.clientY - rect.top
                          const height = rect.height
                          
                          // Determine if we're in the top or bottom half
                          if (y < height / 2) {
                            setDropTarget({ index, position: 'before' })
                          } else {
                            setDropTarget({ index, position: 'after' })
                          }
                        }
                      }}
                      onDragLeave={(e) => {
                        // Only clear if we're leaving the entire track area
                        const rect = e.currentTarget.getBoundingClientRect()
                        if (e.clientX < rect.left || e.clientX > rect.right || 
                            e.clientY < rect.top || e.clientY > rect.bottom) {
                          setDropTarget(null)
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (draggedIndex !== null && dropTarget) {
                          let targetIndex = dropTarget.index
                          if (dropTarget.position === 'after') {
                            targetIndex += 1
                          }
                          // Adjust for the fact that we're removing the dragged item first
                          if (draggedIndex < targetIndex) {
                            targetIndex -= 1
                          }
                          queueAudio.moveTrack(draggedIndex, targetIndex)
                        }
                        setDraggedIndex(null)
                        setDropTarget(null)
                      }}
                      style={{
                        padding: '6px 8px',
                        borderBottom: '1px solid #eee',
                        backgroundColor: 
                          isDragging ? '#f0f0f0' : 
                          isCurrentTrack ? '#e6f3ff' : 
                          isAlreadyPlayed ? '#f8f8f8' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        opacity: isDragging ? 0.5 : (isAlreadyPlayed ? 0.6 : 1),
                        transition: 'background-color 0.2s ease, opacity 0.2s ease',
                        minWidth: 0,
                        overflow: 'hidden'
                      }}
                    >
                    {/* Drag handle */}
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

                    {/* Track info - clickable area */}
                    <div
                      onClick={() => queueAudio.goToTrack(index)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '4px 0',
                        borderRadius: '2px',
                        minWidth: 0,
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentTrack && !isDragging) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                      title="Click to play this track"
                    >
                      {/* Current track indicator / spacer */}
                      <span style={{
                        color: isCurrentTrack ? '#0066cc' : (isAlreadyPlayed ? '#999' : 'transparent'),
                        fontSize: '14px',
                        minWidth: '20px'
                      }}>
                        {isCurrentTrack 
                          ? (queueAudio.isGloballyPlaying ? '▶' : '⏸') 
                          : (isAlreadyPlayed ? '✓' : '•')
                        }
                      </span>

                      {/* Track title */}
                      <span style={{
                        fontWeight: isCurrentTrack ? 'bold' : 'normal',
                        color: isCurrentTrack ? '#0066cc' : (isAlreadyPlayed ? '#999' : '#000'),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: '1 1 0',
                        minWidth: 0,
                        marginRight: '12px'
                      }}>
                        {track.title}
                      </span>

                      {/* Artist */}
                      <span style={{
                        color: isAlreadyPlayed ? '#aaa' : '#666',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: '0 1 auto',
                        minWidth: 0,
                        maxWidth: '40%'
                      }}>
                        {track.artist}
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (canRemove) {
                          queueAudio.removeTrack(index)
                        }
                      }}
                      disabled={!canRemove}
                      style={{
                        width: '16px',
                        height: '16px',
                        padding: '0',
                        fontSize: '10px',
                        lineHeight: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #ccc',
                        backgroundColor: canRemove ? '#ffeeee' : '#f5f5f5',
                        color: canRemove ? '#cc0000' : '#aaa',
                        cursor: canRemove ? 'pointer' : 'not-allowed',
                        fontFamily: 'Courier New, monospace',
                        borderRadius: '2px'
                      }}
                      title={canRemove ? "Remove from queue" : isCurrentTrack ? "Cannot remove currently playing track" : "Cannot remove last track"}
                    >
                      ✕
                    </button>
                    </div>
                    
                    {/* Drop indicator after */}
                    {showDropAfter && (
                      <div style={{
                        height: '3px',
                        backgroundColor: '#0066cc',
                        margin: '0 12px',
                        borderRadius: '1px',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '-3px',
                          top: '-2px',
                          width: '6px',
                          height: '6px',
                          backgroundColor: '#0066cc',
                          borderRadius: '50%'
                        }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer with controls */}
            <div 
              className="modal-footer"
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #ccc',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <span style={{
                fontSize: '11px',
                color: '#666',
                textAlign: 'center'
              }}>
                Track {(queueAudio.currentQueue?.currentIndex || 0) + 1} of {queueAudio.currentQueue.tracks.length}
              </span>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <button
                  onClick={queueAudio.prevTrack}
                  disabled={!hasPrevTrack}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    background: 'none !important',
                    border: 'none !important',
                    fontSize: '8px !important',
                    color: hasPrevTrack ? '#000 !important' : '#ccc !important',
                    cursor: hasPrevTrack ? 'pointer' : 'not-allowed',
                    fontFamily: 'Courier New, monospace !important',
                    padding: '0 !important',
                    margin: '0 !important',
                    lineHeight: '1',
                    outline: 'none'
                  }}
                  title="Previous track"
                >
                  {'<<'}
                </button>
                
                <button
                  onClick={queueAudio.togglePlayPause}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    background: 'none !important',
                    border: 'none !important',
                    fontSize: '8px !important',
                    color: '#000 !important',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace !important',
                    padding: '0 !important',
                    margin: '0 2px !important',
                    lineHeight: '1',
                    outline: 'none'
                  }}
                  title={queueAudio.isGloballyPlaying ? 'Pause' : 'Play'}
                >
                  {queueAudio.isGloballyPlaying ? '||' : '>'}
                </button>
                
                <button
                  onClick={queueAudio.nextTrack}
                  disabled={!hasNextTrack}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    background: 'none !important',
                    border: 'none !important',
                    fontSize: '8px !important',
                    color: hasNextTrack ? '#000 !important' : '#ccc !important',
                    cursor: hasNextTrack ? 'pointer' : 'not-allowed',
                    fontFamily: 'Courier New, monospace !important',
                    padding: '0 !important',
                    margin: '0 !important',
                    lineHeight: '1',
                    outline: 'none'
                  }}
                  title="Next track"
                >
                  {'>>'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-now-playing {
            display: flex !important;
          }
          
          .desktop-now-playing {
            display: none !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-now-playing {
            display: none !important;
          }
          
          .desktop-now-playing {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  )
}