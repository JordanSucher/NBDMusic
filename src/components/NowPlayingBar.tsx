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

  return (
    <div style={{
      borderBottom: '1px solid #000',
      padding: '8px 0',
      backgroundColor: '#ffffff'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '4px 20px',
        fontFamily: 'Courier New, monospace',
        fontSize: '11px'
      }}>
        {/* First line: Track info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '14px',
          lineHeight: '1.2',
          marginBottom: '8px'
        }}>
          {/* Track title - clickable to release */}
          <Link 
            href={`/release/${activeTrack.releaseId}`}
            style={{
              fontWeight: 'bold', 
              color: '#0000EE',
              textDecoration: 'underline',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '350px',
              fontSize: '14px'
            }}
            title={activeTrack.title.replace(/^\d+\.\s*/, '')}
          >
            {activeTrack.title.replace(/^\d+\.\s*/, '')}
          </Link>
          
          {/* Separator */}
          <span style={{ 
            color: '#666',
            margin: '0 2px',
            fontSize: '14px'
          }}>by</span>
          
          {/* Artist link */}
          <Link 
            href={`/user/${activeTrack.artist}`}
            style={{
              color: '#0000EE',
              textDecoration: 'underline',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '14px'
            }}
            title={activeTrack.artist}
          >
            {activeTrack.artist}
          </Link>
        </div>

        {/* Second line: Controls and progress bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
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
            {'<<'}
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
            {isGloballyPlaying ? '||' : '>'}
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
            {'>>'}
          </button>
          
          {/* Progress Bar */}
          <div 
            onClick={handleProgressClick}
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
    </div>
  )
}