import { useRef, useEffect, useState } from "react"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"
import { persistentAudioPlayer } from "@/lib/PersistentAudioPlayer"
import DitheredBackground from "./DitheredBackground"
import LikeButton from "./LikeButton"

interface AudioPlayerProps {
  src: string
  title: string
  artist: string
  trackId?: string // Add trackId for listen tracking
  listenCount?: number // Add listen count to display
  onTrackEnd?: () => void
  onNextTrack?: () => void
  onPrevTrack?: () => void
  hasNextTrack?: boolean
  hasPrevTrack?: boolean
  currentTrackIndex?: number
  totalTracks?: number
  autoPlay?: boolean
  releaseId?: string // Add releaseId to identify the source
}

export default function AudioPlayer({ 
  src, 
  title, 
  artist, 
  trackId,
  listenCount,
  onTrackEnd,
  onNextTrack,
  onPrevTrack,
  hasNextTrack = false,
  hasPrevTrack = false,
  currentTrackIndex,
  totalTracks,
  autoPlay = false,
  releaseId = "unknown"
}: AudioPlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  // Create consistent player ID based on trackId or src to maintain identity across pages
  const playerIdRef = useRef<string>(`player-${trackId || src.split('/').pop()?.split('.')[0] || 'unknown'}`)
  
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [listenTracked, setListenTracked] = useState(false) // Track if we've recorded a listen for this track

  const queueAudio = useQueueAudioContext()

  // Check if this player's track is currently playing in the queue
  const isActive = queueAudio.currentTrack?.fileUrl === src

  // Function to track a listen
  const trackListen = async () => {
    if (!trackId || listenTracked) return
    
    try {
      const response = await fetch(`/api/tracks/${trackId}/listen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setListenTracked(true)
        console.log('Listen tracked for track:', trackId)
      }
    } catch (error) {
      console.error('Failed to track listen:', error)
    }
  }

  // Check if we should track a listen based on current time and duration
  const shouldTrackListen = (currentTime: number, duration: number): boolean => {
    if (listenTracked || !trackId || duration === 0) return false
    
    // Track after 30 seconds OR 25% of track duration, whichever is shorter
    const thirtySeconds = 30
    const twentyFivePercent = duration * 0.25
    const threshold = Math.min(thirtySeconds, twentyFivePercent)
    
    return currentTime >= threshold
  }

  // Track listen when playing via queue
  useEffect(() => {
    if (!isActive || !queueAudio.isGloballyPlaying) return
    
    const currentTime = queueAudio.currentTime
    const duration = queueAudio.duration
    
    // Check if we should track a listen
    if (shouldTrackListen(currentTime, duration)) {
      setListenTracked(true) // Set this immediately to prevent duplicates
      trackListen()
    }
  }, [queueAudio.currentTime, queueAudio.duration, queueAudio.isGloballyPlaying, isActive, listenTracked])

  // Reset listen tracking when track changes
  useEffect(() => {
    setListenTracked(false)
  }, [src])

  // Auto-update duration in database when it becomes available
  useEffect(() => {
    const updateDuration = async () => {
      // Only update if we have a trackId, duration is available, and it's the currently active track
      if (trackId && isActive && queueAudio.duration > 0) {
        // Check if the current track in queue has no duration (null or 0)
        const currentTrack = queueAudio.currentTrack
        if (currentTrack && (!currentTrack.duration || currentTrack.duration === 0)) {
          try {
            console.log(`🎵 Auto-updating duration for track ${trackId}: ${queueAudio.duration}s`)
            const response = await fetch('/api/admin/update-track-duration', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                trackId: trackId,
                duration: Math.floor(queueAudio.duration)
              })
            })

            if (response.ok) {
              console.log(`✅ Duration updated for track ${trackId}`)
              // Trigger a page refresh or state update to show the new duration
              // This will be reflected when the user navigates back to the release
            } else {
              console.log(`❌ Failed to update duration for track ${trackId}`)
            }
          } catch (error) {
            console.error('Error updating track duration:', error)
          }
        }
      }
    }

    // Small delay to ensure duration is stable
    const timeoutId = setTimeout(updateDuration, 1000)
    return () => clearTimeout(timeoutId)
  }, [trackId, isActive, queueAudio.duration, queueAudio.currentTrack])

  // No longer needed - queue handles all playback management

  const togglePlayPause = async () => {
    const isCurrentlyPlaying = isActive && queueAudio.isGloballyPlaying
    console.log('🔄 togglePlayPause called - isActive:', isActive, 'isGloballyPlaying:', queueAudio.isGloballyPlaying)

    // Mark that user has interacted with the player
    setHasUserInteracted(true)

    if (isCurrentlyPlaying) {
      console.log('🔄 Pausing audio')
      queueAudio.togglePlayPause()
    } else {
      console.log('🔄 Starting playback - creating release queue')
      // Create release queue and start at this track
      if (releaseId && currentTrackIndex !== undefined) {
        await queueAudio.playRelease(releaseId, currentTrackIndex)
      }
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressRef.current
    if (!progressBar) return

    // If this player is not active, switch to this track instead of seeking
    if (!isActive) {
      console.log('🎯 Switching to inactive player:', playerIdRef.current)
      togglePlayPause() // This will set this player as active and start playing
      return
    }

    if (!displayDuration) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * displayDuration
    
    console.log('🎯 AudioPlayer progress bar clicked - seeking to:', newTime, 'displayDuration:', displayDuration)
    
    // Use the same protected seeking logic as the now playing bar
    seekToTime(newTime)
  }

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only handle touchend to avoid multiple calls during drag
    if (e.type !== 'touchend') return
    
    const progressBar = progressRef.current
    if (!progressBar) return

    // Prevent scrolling and other touch behaviors
    e.preventDefault()
    
    // If this player is not active, switch to this track instead of seeking
    if (!isActive) {
      console.log('📱 Switching to inactive player via touch:', playerIdRef.current)
      togglePlayPause() // This will set this player as active and start playing
      return
    }

    if (!displayDuration) return
    
    const rect = progressBar.getBoundingClientRect()
    const touch = e.changedTouches[0] // Use changedTouches for touchend
    const touchX = touch.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, touchX / rect.width)) // Clamp between 0 and 1
    const newTime = percentage * displayDuration
    
    console.log('📱 AudioPlayer progress bar touched - seeking to:', newTime, 'displayDuration:', displayDuration)
    
    // Add a small delay to ensure touch events are fully processed
    setTimeout(() => {
      seekToTime(newTime)
    }, 10)
  }

  const handleNext = () => {
    console.log('🔄 Next button clicked - isActive:', isActive, 'hasNextTrack:', hasNextTrack, 'onNextTrack:', !!onNextTrack)
    
    if (isActive) {
      // Use queue next track if this is the active player
      queueAudio.nextTrack()
    } else if (onNextTrack && hasNextTrack) {
      // Fallback to local callback for inactive players
      setHasUserInteracted(true)
      onNextTrack()
    }
  }

  const handlePrev = () => {
    console.log('🔄 Prev button clicked - isActive:', isActive, 'hasPrevTrack:', hasPrevTrack, 'onPrevTrack:', !!onPrevTrack)
    
    if (isActive) {
      // Use queue prev track if this is the active player
      queueAudio.prevTrack()
    } else if (onPrevTrack && hasPrevTrack) {
      // Fallback to local callback for inactive players
      setHasUserInteracted(true)
      onPrevTrack()
    }
  }

  const restartTrack = () => {
    console.log('🔄 Restarting track via persistent player')
    persistentAudioPlayer.setCurrentTime(0)
    setHasUserInteracted(true)
  }

  const seekToTime = (time: number) => {
    console.log('🎯 seekToTime via persistent player - seeking to:', time)
    
    // Use persistent player for seeking
    persistentAudioPlayer.setCurrentTime(time)
    setHasUserInteracted(true)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Use queue audio progress when this is the active player
  const displayCurrentTime = isActive ? queueAudio.currentTime : 0
  const displayDuration = isActive ? queueAudio.duration : 0
  const progressPercentage = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0

  return (
    <div className="subtle-dither" style={{ 
      border: '1px solid #ccc', 
      padding: '8px', 
      backgroundColor: '#f9f9f9',
      fontFamily: 'Courier New, monospace',
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>


      {/* Track Info */}
      <div style={{ 
        fontSize: '12px', 
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>{title}</strong>
          <br />
          <span style={{ color: '#666' }}>
            by {artist}{listenCount !== undefined && ` • ${listenCount} plays`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {trackId && (
            <LikeButton 
              trackId={trackId} 
              size="medium"
            />
          )}
          {currentTrackIndex !== undefined && totalTracks !== undefined && totalTracks > 1 && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              Track {currentTrackIndex + 1} of {totalTracks}
            </div>
          )}
        </div>
      </div>

      {/* Main Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '6px'
      }}>
        {/* Previous Button */}
        {(hasNextTrack || hasPrevTrack) && (
          <button
            onClick={handlePrev}
            onTouchStart={(e) => {
              e.currentTarget.blur()
            }}
            onTouchEnd={(e) => {
              setTimeout(() => e.currentTarget.blur(), 10)
            }}
            disabled={!hasPrevTrack}
            style={{
              padding: '6px 8px',
              fontSize: '14px',
              cursor: hasPrevTrack ? 'pointer' : 'not-allowed',
              fontFamily: 'Courier New, monospace'
            }}
            title="Previous track"
          >
            {'<<'}
          </button>
        )}

        {/* Play/Pause Button */}
        <button
          className="play-pause-btn elegant-dither"
          onClick={togglePlayPause}
          onTouchStart={(e) => {
            // Immediately blur to prevent focus state
            e.currentTarget.blur()
          }}
          onTouchEnd={(e) => {
            // Ensure no focus remains after touch
            setTimeout(() => e.currentTarget.blur(), 10)
          }}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            minWidth: '60px'
          }}
        >
          {isActive && queueAudio.isGloballyPlaying ? '||' : '>'}
        </button>

        {/* Next Button */}
        {(hasNextTrack || hasPrevTrack) && (
          <button
            onClick={handleNext}
            onTouchStart={(e) => {
              e.currentTarget.blur()
            }}
            onTouchEnd={(e) => {
              setTimeout(() => e.currentTarget.blur(), 10)
            }}
            disabled={!hasNextTrack}
            style={{
              padding: '6px 8px',
              fontSize: '14px',
              cursor: hasNextTrack ? 'pointer' : 'not-allowed',
              fontFamily: 'Courier New, monospace'
            }}
            title="Next track"
          >
            {'>>'}
          </button>
        )}

        {/* Time Display */}
        <div style={{ 
          fontSize: '11px', 
          color: '#666',
          marginLeft: 'auto',
          fontFamily: 'Courier New, monospace'
        }}>
          {formatTime(displayCurrentTime)} / {formatTime(displayDuration)}
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        ref={progressRef}
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
          borderRadius: '2px'
        }}
      >
        {/* Progress Fill */}
        <div
          className="elegant-dither"
          style={{
            height: '100%',
            width: `${progressPercentage}%`,
            backgroundColor: '#666',
            transition: 'width 0.1s ease'
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

    </div>
  )
}
