"use client"

import { useRef, useState, useEffect } from "react"

interface AudioPlayerProps {
  src: string
  title: string
  artist: string
}

export default function AudioPlayer({ src, title, artist }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const setAudioData = () => {
      setDuration(audio.duration)
      setCurrentTime(audio.currentTime)
    }

    const setAudioTime = () => setCurrentTime(audio.currentTime)
    
    const handleLoadStart = () => setLoading(true)
    const handleCanPlay = () => setLoading(false)
    
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('loadeddata', setAudioData)
    audio.addEventListener('timeupdate', setAudioTime)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadeddata', setAudioData)
      audio.removeEventListener('timeupdate', setAudioTime)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const seekTime = (parseFloat(e.target.value) / 100) * duration
    audio.currentTime = seekTime
    setCurrentTime(seekTime)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0

  return (
    <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
      <div style={{ marginBottom: '5px', fontSize: '12px' }}>
        <strong>Now: {title}</strong> by {artist}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
        <button 
          onClick={togglePlayPause}
          disabled={loading}
          style={{ 
            minWidth: '60px',
            fontSize: '12px'
          }}
        >
          {loading ? '...' : isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={progressPercentage}
          onChange={handleSeek}
          style={{
            flex: 1,
            height: '4px',
            background: '#ddd',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        
        <span style={{ fontSize: '11px', minWidth: '80px' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div style={{ fontSize: '11px', color: '#666' }}>
        {loading && 'Loading audio...'}
      </div>
    </div>
  )
}
