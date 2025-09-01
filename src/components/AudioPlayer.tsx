import { useRef, useEffect, useState } from "react"
import { useAudioContext } from "@/contexts/AudioContext"
import DitheredBackground from "./DitheredBackground"

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
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const playerIdRef = useRef<string>(`player-${Math.random().toString(36).substr(2, 9)}`)
  
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [listenTracked, setListenTracked] = useState(false) // Track if we've recorded a listen for this track
  const [isSeeking, setIsSeeking] = useState(false) // Track if we're currently seeking
  const isSeekingRef = useRef(false) // Ref version for event handlers
  const handlersRef = useRef<{ handlePlay?: () => void, handlePause?: () => void }>({})

  const audioContext = useAudioContext()

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

  // Register control callbacks when this player becomes active
  useEffect(() => {
    if (audioContext.isActivePlayer(playerIdRef.current)) {
      audioContext.setPlayerToggleCallback(togglePlayPause, restartTrack, seekToTime);
      audioContext.setTrackControls(hasNextTrack, hasPrevTrack, onNextTrack, onPrevTrack);
    }
  }, [audioContext, hasNextTrack, hasPrevTrack, onNextTrack, onPrevTrack]);

  // Don't clear active player on unmount - let the audio context handle it naturally

  // Stop this player if another player becomes active
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    // Only stop if this player is playing AND there's a different active player
    if (isPlaying && audioContext.activePlayerId && audioContext.activePlayerId !== playerIdRef.current) {
      audio.pause()
      setIsPlaying(false)
    }
  }, [audioContext.activePlayerId, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      setIsPlaying(false)
      // Only update global state if this is the active player
      if (audioContext.isActivePlayer(playerIdRef.current)) {
        audioContext.setPlaying(false)
        // Clear the active player when the track ends naturally
        audioContext.clearActivePlayer()
      }
      if (onTrackEnd) {
        onTrackEnd()
      }
    }

    const handleTimeUpdate = () => {
      const newCurrentTime = audio.currentTime
      setCurrentTime(newCurrentTime)
      
      // Update global progress if this is the active player
      if (audioContext.isActivePlayer(playerIdRef.current)) {
        audioContext.updateProgress(newCurrentTime, audio.duration)
      }
      
      // Check if we should track a listen
      if (shouldTrackListen(newCurrentTime, audio.duration)) {
        setListenTracked(true) // Set this immediately to prevent duplicates
        trackListen()
      }
    }

    const handleDurationChange = () => {
      setDuration(audio.duration)
      
      // Update global duration if this is the active player
      if (audioContext.isActivePlayer(playerIdRef.current)) {
        audioContext.updateProgress(audio.currentTime, audio.duration)
      }
    }

    const handleLoadStart = () => {
      setIsLoading(true)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      
      // Don't auto-play if we're currently seeking
      if (isSeekingRef.current) {
        console.log('🚫 Skipping auto-play during seek')
        return
      }
      
      // Only auto-play if:
      // 1. This is not the first load (track changed due to auto-advance)
      // 2. User has interacted with the player before
      // 3. autoPlay is enabled
      if (!isFirstLoad && hasUserInteracted && autoPlay) {
        const trackInfo = {
          src,
          title,
          artist,
          releaseId,
          trackIndex: currentTrackIndex || 0,
          playerId: playerIdRef.current
        }
        
        // Set this as the active player
        audioContext.setActivePlayer(playerIdRef.current, trackInfo)
        audioContext.setCurrentTrackId(trackId || null)
        audioContext.setPlayerToggleCallback(togglePlayPause, restartTrack, seekToTime)
        audioContext.setTrackControls(hasNextTrack, hasPrevTrack, onNextTrack, onPrevTrack)
        
        audio.play().then(() => {
          setIsPlaying(true)
        }).catch(error => {
          console.log("Auto-play prevented by browser:", error)
        })
      }
    }

    const handlePlay = () => {
      console.log('🎵 PLAY EVENT TRIGGERED - isSeeking:', isSeeking, 'isPlaying:', isPlaying)
      // Don't trigger play state changes if we're seeking
      if (isSeeking) {
        console.log('Ignoring play event during seeking')
        return
      }
      console.log('🎵 Setting isPlaying to true')
      setIsPlaying(true)
      // Only update global state if this is the active player
      if (audioContext.isActivePlayer(playerIdRef.current)) {
        console.log('🎵 Setting global playing state to true')
        audioContext.setPlaying(true)
      }
    }

    const handlePause = () => {
      console.log('⏸️ PAUSE EVENT TRIGGERED - isSeeking:', isSeeking, 'isPlaying:', isPlaying)
      // Don't trigger pause state changes if we're seeking (unless it was intentional)
      if (isSeeking) {
        console.log('Ignoring pause event during seeking')
        return
      }
      console.log('⏸️ Setting isPlaying to false')
      setIsPlaying(false)
      // Only update global state if this is the active player
      if (audioContext.isActivePlayer(playerIdRef.current)) {
        console.log('⏸️ Setting global playing state to false')
        audioContext.setPlaying(false)
      }
    }

    // Store handlers in ref for access outside useEffect
    handlersRef.current.handlePlay = handlePlay
    handlersRef.current.handlePause = handlePause

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    
    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [onTrackEnd, autoPlay, isFirstLoad, audioContext, src, title, artist, releaseId, currentTrackIndex, hasUserInteracted])

  // Handle src changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.load()
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setListenTracked(false) // Reset listen tracking for new track
    
    // Mark that we've loaded the first track
    if (isFirstLoad) {
      setIsFirstLoad(false)
    }
  }, [src, isFirstLoad])

  const togglePlayPause = () => {
    console.log('🔄 togglePlayPause called - current isPlaying:', isPlaying)
    const audio = audioRef.current
    if (!audio) return

    // Mark that user has interacted with the player
    setHasUserInteracted(true)

    if (isPlaying) {
      console.log('🔄 Pausing audio')
      audio.pause()
    } else {
      console.log('🔄 Starting playback')
      // Set this as the active player FIRST
      const trackInfo = {
        src,
        title,
        artist,
        releaseId,
        trackIndex: currentTrackIndex || 0,
        playerId: playerIdRef.current
      }
      
      audioContext.setActivePlayer(playerIdRef.current, trackInfo)
      audioContext.setCurrentTrackId(trackId || null)
      audioContext.setPlayerToggleCallback(togglePlayPause, restartTrack, seekToTime)
      audioContext.setTrackControls(hasNextTrack, hasPrevTrack, onNextTrack, onPrevTrack)
      
      // Then start playing
      audio.play().then(() => {
        console.log('🔄 Audio.play() succeeded')
        setIsPlaying(true)
      }).catch(error => {
        console.log("🔄 Play prevented:", error)
      })
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const progressBar = progressRef.current
    if (!audio || !progressBar || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    
    console.log('🎯 AudioPlayer progress bar clicked - seeking to:', newTime, 'isPlaying:', isPlaying, 'audio.paused:', audio.paused)
    
    // Use the same protected seeking logic as the now playing bar
    seekToTime(newTime)
  }

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only handle touchend to avoid multiple calls during drag
    if (e.type !== 'touchend') return
    
    const audio = audioRef.current
    const progressBar = progressRef.current
    if (!audio || !progressBar || !duration) return

    // Prevent scrolling and other touch behaviors
    e.preventDefault()
    
    const rect = progressBar.getBoundingClientRect()
    const touch = e.changedTouches[0] // Use changedTouches for touchend
    const touchX = touch.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, touchX / rect.width)) // Clamp between 0 and 1
    const newTime = percentage * duration
    
    console.log('📱 AudioPlayer progress bar touched - seeking to:', newTime, 'isPlaying:', isPlaying, 'audio.paused:', audio.paused)
    
    seekToTime(newTime)
  }

  const handleNext = () => {
    if (onNextTrack && hasNextTrack) {
      setHasUserInteracted(true)
      onNextTrack()
    }
  }

  const handlePrev = () => {
    if (onPrevTrack && hasPrevTrack) {
      setHasUserInteracted(true)
      onPrevTrack()
    }
  }

  const restartTrack = () => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = 0
      setHasUserInteracted(true)
    }
  }

  const seekToTime = (time: number) => {
    const audio = audioRef.current
    if (audio) {
      // Check the actual audio element state, not React state
      const wasActuallyPlaying = !audio.paused && !audio.ended
      console.log('🎯 seekToTime - React isPlaying:', isPlaying, 'audio.paused:', audio.paused, 'wasActuallyPlaying:', wasActuallyPlaying, 'seeking to:', time)
      
      // Set seeking flag to prevent auto-play
      isSeekingRef.current = true
      
      if (!wasActuallyPlaying) {
        // If audio wasn't actually playing, temporarily disable play ability during the seek
        const originalPlay = audio.play
        let isBlocking = true
        
        audio.play = () => {
          if (isBlocking) {
            console.log('🚫 Blocked audio.play() call during seek')
            return Promise.resolve()
          } else {
            return originalPlay.call(audio)
          }
        }
        
        audio.currentTime = time
        
        // Restore play method and clear seeking flag
        setTimeout(() => {
          isBlocking = false
          audio.play = originalPlay
          isSeekingRef.current = false // Clear seeking flag
          
          // Ensure state is synchronized - if audio is paused, React state should reflect that
          if (audio.paused) {
            setIsPlaying(false)
            if (audioContext.isActivePlayer(playerIdRef.current)) {
              audioContext.setPlaying(false)
            }
          }
          
          console.log('✅ Restored audio.play() method and synchronized state')
        }, 10) // Much shorter delay
      } else {
        // If audio was actually playing, just seek normally
        audio.currentTime = time
        // Clear seeking flag after a short delay
        setTimeout(() => {
          isSeekingRef.current = false
        }, 10)
      }
      
      setHasUserInteracted(true)
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="subtle-dither" style={{ 
      border: '1px solid #ccc', 
      padding: '8px', 
      backgroundColor: '#f9f9f9',
      fontFamily: 'Courier New, monospace',
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata">
        <source src={src} />
        Your browser does not support the audio element.
      </audio>

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
        {currentTrackIndex !== undefined && totalTracks !== undefined && totalTracks > 1 && (
          <div style={{ fontSize: '11px', color: '#666' }}>
            Track {currentTrackIndex + 1} of {totalTracks}
          </div>
        )}
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
            disabled={!hasPrevTrack}
            style={{
              padding: '4px 6px',
              fontSize: '10px',
              backgroundColor: hasPrevTrack ? '#ddd' : '#f0f0f0',
              color: hasPrevTrack ? '#000' : '#999',
              border: '2px outset #ddd',
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
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            backgroundColor: isLoading ? '#f0f0f0' : '#e8e8e8',
            color: isLoading ? '#999' : '#000',
            border: '1px solid #bbb',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'Courier New, monospace',
            minWidth: '60px',
            transition: 'all 0.1s ease'
          }}
        >
          {isLoading ? '...' : isPlaying ? '||' : '>'}
        </button>

        {/* Next Button */}
        {(hasNextTrack || hasPrevTrack) && (
          <button
            onClick={handleNext}
            disabled={!hasNextTrack}
            style={{
              padding: '4px 6px',
              fontSize: '10px',
              backgroundColor: hasNextTrack ? '#ddd' : '#f0f0f0',
              color: hasNextTrack ? '#000' : '#999',
              border: '2px outset #ddd',
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
          {formatTime(currentTime)} / {formatTime(duration)}
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
