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

  useEffect(() => {
    const playerId = playerIdRef.current

    // Register this player with the global context
    audioContext.registerPlayer(playerId, () => {
      // This callback is called when another player starts playing
      const audio = audioRef.current
      if (audio && !audio.paused) {
        audio.pause()
        setIsPlaying(false)
      }
    })

    return () => {
      audioContext.unregisterPlayer(playerId)
    }
  }, [audioContext])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      setIsPlaying(false)
      audioContext.notifyStop(playerIdRef.current)
      if (onTrackEnd) {
        onTrackEnd()
      }
    }

    const handleTimeUpdate = () => {
      const newCurrentTime = audio.currentTime
      setCurrentTime(newCurrentTime)
      
      // Check if we should track a listen
      if (shouldTrackListen(newCurrentTime, audio.duration)) {
        setListenTracked(true) // Set this immediately to prevent duplicates
        trackListen()
      }
    }

    const handleDurationChange = () => {
      setDuration(audio.duration)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      
      // Only auto-play if:
      // 1. This is not the first load (track changed due to auto-advance)
      // 2. User has interacted with the player before
      // 3. autoPlay is enabled
      // 4. This player is allowed to play (no other player is active)
      if (!isFirstLoad && hasUserInteracted && autoPlay) {
        // Request permission to play from global context
        const trackInfo = {
          src,
          title,
          artist,
          releaseId,
          trackIndex: currentTrackIndex || 0,
          playerId: playerIdRef.current
        }
        
        if (audioContext.requestPlay(playerIdRef.current, trackInfo)) {
          audioContext.setCurrentTrackId(trackId || null)
          audio.play().then(() => {
            setIsPlaying(true)
            audioContext.notifyPlay(playerIdRef.current)
          }).catch(error => {
            console.log("Auto-play prevented by browser:", error)
          })
        }
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      audioContext.notifyPlay(playerIdRef.current)
    }

    const handlePause = () => {
      setIsPlaying(false)
      audioContext.notifyPause(playerIdRef.current)
    }

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
    const audio = audioRef.current
    if (!audio) return

    // Mark that user has interacted with the player
    setHasUserInteracted(true)

    if (isPlaying) {
      audio.pause()
    } else {
      // Request permission to play from global context
      const trackInfo = {
        src,
        title,
        artist,
        releaseId,
        trackIndex: currentTrackIndex || 0,
        playerId: playerIdRef.current
      }
      
      if (audioContext.requestPlay(playerIdRef.current, trackInfo)) {
        audioContext.setCurrentTrackId(trackId || null)
        audio.play().catch(error => {
          console.log("Play prevented:", error)
        })
      }
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
    
    audio.currentTime = newTime
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
            ⏮
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
          {isLoading ? '...' : isPlaying ? '⏸' : '▶'}
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
            ⏭
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
