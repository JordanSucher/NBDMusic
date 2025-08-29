"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useAudioContext } from "@/contexts/AudioContext"

interface NowPlayingBarProps {
  isHeaderVisible: boolean;
}

export default function NowPlayingBar({ isHeaderVisible }: NowPlayingBarProps) {
  const { 
    activeTrack, 
    isGloballyPlaying,
    currentTime,
    duration,
    hasNextTrack,
    hasPrevTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekToTime
  } = useAudioContext()

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
    if (!duration) return
    
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    
    seekToTime(newTime)
  }

  return (
    <div style={{
      borderBottom: '1px solid #000',
      padding: '8px 0',
      backgroundColor: '#ffffff'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px',
        fontFamily: 'Courier New, monospace',
        fontSize: '11px'
      }}>
        {/* First line: Controls and track info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '3px'
        }}>
          {/* Previous button */}
          <button
            onClick={prevTrack}
            disabled={!hasPrevTrack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '8px',
              color: hasPrevTrack ? '#000' : '#ccc',
              cursor: hasPrevTrack ? 'pointer' : 'not-allowed',
              fontFamily: 'Courier New, monospace',
              padding: '0',
              margin: '0',
              lineHeight: '1'
            }}
            title="Previous track"
          >
            ⏮
          </button>

          {/* Play/pause button */}
          <button
            onClick={togglePlayPause}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '8px',
              color: '#000',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              padding: '0',
              margin: '0 2px',
              lineHeight: '1'
            }}
            title={isGloballyPlaying ? 'Pause' : 'Play'}
          >
            {isGloballyPlaying ? '⏸' : '▶'}
          </button>

          {/* Next button */}
          <button
            onClick={nextTrack}
            disabled={!hasNextTrack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '8px',
              color: hasNextTrack ? '#000' : '#ccc',
              cursor: hasNextTrack ? 'pointer' : 'not-allowed',
              fontFamily: 'Courier New, monospace',
              padding: '0',
              margin: '0',
              lineHeight: '1'
            }}
            title="Next track"
          >
            ⏭
          </button>
          
          {/* Track title - clickable to release */}
          <Link 
            href={`/release/${activeTrack.releaseId}`}
            style={{
              fontWeight: 'bold', 
              color: '#0000EE',
              textDecoration: 'underline',
              marginLeft: '8px'
            }}
          >
            {activeTrack.title.replace(/^\d+\.\s*/, '')}
          </Link>
          
          {/* Separator */}
          <span style={{ color: '#666' }}>-</span>
          
          {/* Artist link */}
          <Link 
            href={`/user/${activeTrack.artist}`}
            style={{
              color: '#0000EE',
              textDecoration: 'underline'
            }}
          >
            {activeTrack.artist}
          </Link>
        </div>

        {/* Second line: Progress bar and time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {/* Progress Bar */}
          <div 
            onClick={handleProgressClick}
            style={{
              height: '6px',
              backgroundColor: '#e0e0e0',
              border: '1px solid #ccc',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              flex: 1
            }}
          >
            <div style={{
              height: '100%',
              width: `${progressPercentage}%`,
              backgroundColor: '#666',
              transition: 'width 0.1s ease'
            }} />
          </div>
          
          {/* Time display */}
          <span style={{ 
            color: '#666', 
            fontSize: '10px',
            whiteSpace: 'nowrap'
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}