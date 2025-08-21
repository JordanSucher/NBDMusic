// src/app/release/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import AudioPlayer from "@/components/AudioPlayer"
import FollowButton from "@/components/FollowButton"
import { useAudioContext } from "@/contexts/AudioContext"

interface Track {
  id: string
  title: string
  trackNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  duration: number | null
  mimeType: string
  lyrics: string | null
  _count: {
    listens: number
  }
}

interface Release {
  id: string
  title: string
  description: string | null
  releaseType: string
  artworkUrl: string | null
  releaseDate: string | null
  uploadedAt: string
  user: {
    username: string
  }
  tags: {
    tag: {
      name: string
    }
  }[]
  tracks: Track[]
}

export default function ReleasePage() {
  const { data: session } = useSession()
  const params = useParams()
  const releaseId = params.id as string
  const audioContext = useAudioContext()
  
  const [release, setRelease] = useState<Release | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentTrack, setCurrentTrack] = useState(0)
  const [showQR, setShowQR] = useState(false)
  const [expandedLyrics, setExpandedLyrics] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchRelease = async () => {
        try {
        const response = await fetch(`/api/releases/${releaseId}`)
        if (response.ok) {
            const data = await response.json()
            setRelease(data.release)
        } else if (response.status === 404) {
            setError("Release not found")
        } else {
            setError("Failed to load release")
        }
        } catch {
        setError("Something went wrong loading the release")
        } finally {
        setLoading(false)
        }
    }

    if (releaseId) {
      fetchRelease()
    }
  }, [releaseId])

  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getReleaseTypeLabel = (type: string) => {
    const labels = {
      single: 'Single',
      ep: 'EP',
      album: 'Album',
      demo: 'Demo'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getTotalDuration = () => {
    return release?.tracks.reduce((total, track) => total + (track.duration || 0), 0) || 0
  }

  const isScheduledRelease = (releaseDate: string | null) => {
    if (!releaseDate) return false
    return new Date(releaseDate) > new Date()
  }

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const handleTrackEnd = () => {
    if (release && currentTrack < release.tracks.length - 1) {
      setCurrentTrack(currentTrack + 1)
    }
  }

  const handleNextTrack = () => {
    if (release && currentTrack < release.tracks.length - 1) {
      setCurrentTrack(currentTrack + 1)
    }
  }

  const handlePrevTrack = () => {
    if (currentTrack > 0) {
      setCurrentTrack(currentTrack - 1)
    }
  }

  const copyShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    // Could add a toast notification here
  }

  const generateQRCode = () => {
    const url = window.location.href
    // Using a simple QR code service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
    return qrUrl
  }

  const downloadQRCode = async () => {
    try {
      const qrUrl = generateQRCode()
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${release?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'release'}-qr-code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download QR code:', error)
      // Fallback: open in new tab
      window.open(generateQRCode(), '_blank')
    }
  }

  const toggleLyrics = (trackId: string) => {
    setExpandedLyrics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(trackId)) {
        newSet.delete(trackId)
      } else {
        newSet.add(trackId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Loading...</h1>
      </div>
    )
  }

  if (error || !release) {
    return (
      <div className="container">
        <h1>Release Not Found</h1>
        <div className="error">{error}</div>
        <p><Link href="/browse">← Back to browse</Link></p>
      </div>
    )
  }

  // Check if current user owns this release (after we confirm release exists)
  const isOwner = session?.user && 
    (session.user.name === release.user.username || session.user.email === release.user.username)

  const sortedTracks = [...release.tracks].sort((a, b) => a.trackNumber - b.trackNumber)

  return (
    <div className="container">

      {/* Release header */}
      <div className="song-card" style={{ marginBottom: '20px', position: 'relative' }}>
        {/* Share buttons in top right */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          zIndex: 1
        }}
        className="share-buttons"
        >
          <button
            onClick={copyShareLink}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: '#4444ff',
              color: 'white',
              border: '1px solid #000',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace'
            }}
          >
            📋 Copy Link
          </button>
          <button
            onClick={() => setShowQR(true)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: '#44ff44',
              color: 'black',
              border: '1px solid #000',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace'
            }}
          >
            📱 QR Code
          </button>
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Album art and info section */}
          <div className="artwork-info-wrapper" style={{ 
            display: 'flex', 
            gap: '20px',
            flexDirection: 'row'
          }}>
            {/* Artwork */}
            {release.artworkUrl ? (
              <div style={{ 
                flexShrink: 0
              }}>
                <img 
                  src={release.artworkUrl} 
                  alt={`${release.title} artwork`}
                  style={{ 
                    width: '150px', 
                    height: '150px', 
                    objectFit: 'cover',
                    border: '2px solid #000',
                    backgroundColor: '#f0f0f0'
                  }}
                />
              </div>
            ) : (
              <div style={{ 
                width: '150px', 
                height: '150px', 
                flexShrink: 0,
                border: '2px solid #000', 
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                alignSelf: 'flex-start'
              }}>
                No Artwork
              </div>
            )}

            {/* Release info */}
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '10px',
                fontFamily: 'Courier New, monospace'
              }}>
                {release.title}
                <span style={{ 
                  fontSize: '14px', 
                  marginLeft: '15px', 
                  padding: '4px 8px', 
                  backgroundColor: '#ddd',
                  border: '1px solid #999'
                }}>
                  {getReleaseTypeLabel(release.releaseType)}
                </span>
              </h1>
              
              <div className="song-meta" style={{ marginBottom: '15px' }}>
                By: <Link href={`/user/${encodeURIComponent(release.user.username)}`}>
                  <strong>{release.user.username}</strong>
                </Link>
                {' '}
                <FollowButton username={release.user.username} variant="link" />
                <br />
                {release.releaseDate && (
                  <>
                    {isScheduledRelease(release.releaseDate) ? 'Scheduled for' : 'Released'}: {formatReleaseDate(release.releaseDate)}
                    <br />
                  </>
                )}
                {!release.releaseDate && (
                  <>
                    Uploaded: {formatDate(release.uploadedAt)}
                    <br />
                  </>
                )}
                {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''} • Total duration: {formatDuration(getTotalDuration())}
                {isScheduledRelease(release.releaseDate) && (
                  <span style={{ 
                    marginLeft: '10px',
                    padding: '2px 6px',
                    backgroundColor: '#ff9900',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    SCHEDULED
                  </span>
                )}
              </div>

              {/* {release.description && (
                <div style={{ 
                  fontSize: '14px', 
                  marginBottom: '15px',
                  fontStyle: 'italic',
                  color: '#555',
                  lineHeight: '1.4'
                }}>
                  {release.description}
                </div>
              )} */}
            </div>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div style={{ marginTop: '15px' }}>
              <Link
                href={`/edit/${release.id}`}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: 'blue',
                  color: 'white',
                  border: '1px solid #000',
                  textDecoration: 'none',
                  fontFamily: 'Courier New, monospace',
                  display: 'inline-block'
                }}
              >
                ✏️ Edit Release
              </Link>
            </div>
          )}
        </div>

        {/* Tags */}
        {release.tags.length > 0 && (
          <div className="song-tags" style={{ marginTop: '20px' }}>
            Tags: {release.tags.map(releaseTag => (
              <Link
                key={releaseTag.tag.name}
                href={`/browse?tag=${encodeURIComponent(releaseTag.tag.name)}`}
                className="tag-link"
                style={{ textDecoration: 'none' }}
              >
                <span className="tag">
                  {releaseTag.tag.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      {release.description && (
        <div 
        className="mt-[20px]! bg-[#fff]! border-[2px]! border-[#000]! p-[10px]! font-[12px]! text-[#666]! mb-[20px]!"
        >
          <p>
            {release.description}
          </p>
        </div>
      )}

      {/* Audio player and track list */}
      <div className="song-card">
        {release.tracks.length === 1 ? (
          // Single track
          <div>
            <h3 style={{ marginBottom: '15px' }}>Listen</h3>
            <div data-release-id={release.id}>
              <AudioPlayer 
                src={sortedTracks[0].fileUrl} 
                title={sortedTracks[0].title}
                artist={release.user.username}
                trackId={sortedTracks[0].id}
                listenCount={sortedTracks[0]._count.listens}
                currentTrackIndex={0}
                totalTracks={1}
                releaseId={release.id}
              />
            </div>
            
            {/* Single track details with lyrics */}
            <div style={{ marginTop: '20px' }}>
              <div 
                onClick={() => {
                  audioContext.setCurrentTrackId(sortedTracks[0].id)
                  // Always trigger play when clicking a track
                  setTimeout(() => {
                    // Find and click the play button for this release's audio player
                    const playButton = document.querySelector(`[data-release-id="${release.id}"] .play-pause-btn`)
                    if (playButton) {
                      (playButton as HTMLElement).click()
                    }
                  }, 0)
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: audioContext.currentTrackId === sortedTracks[0].id ? '#ffff00' : '#f5f5f5',
                  border: audioContext.currentTrackId === sortedTracks[0].id ? '2px solid #000' : '1px solid #ccc',
                  fontSize: '13px',
                  fontFamily: 'Courier New, monospace',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (audioContext.currentTrackId !== sortedTracks[0].id) {
                    e.currentTarget.style.backgroundColor = '#e0e0e0'
                  }
                }}
                onMouseLeave={(e) => {
                  if (audioContext.currentTrackId !== sortedTracks[0].id) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }
                }}
              >
                <span>
                  1. {sortedTracks[0].title}
                  {sortedTracks[0].lyrics && (
                    <span
                      onClick={() => toggleLyrics(sortedTracks[0].id)}
                      style={{
                        marginLeft: '8px',
                        color: '#0066cc',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'Courier New, monospace'
                      }}
                    >
                      lyrics
                    </span>
                  )}
                </span>
                <span style={{ color: '#666', fontSize: '11px' }}>
                  {sortedTracks[0].duration ? formatDuration(sortedTracks[0].duration) : '--'} • {sortedTracks[0]._count.listens} plays
                </span>
              </div>
              
              {expandedLyrics.has(sortedTracks[0].id) && sortedTracks[0].lyrics && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #ccc',
                  borderTop: 'none',
                  fontSize: '12px',
                  fontFamily: 'Courier New, monospace',
                  whiteSpace: 'pre-wrap',
                  color: '#333'
                }}>
                  {sortedTracks[0].lyrics}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Multiple tracks
          <div>
            <h3 style={{ marginBottom: '15px' }}>Listen</h3>
            
            {/* Current track player */}
            <div data-release-id={release.id}>
              <AudioPlayer 
                src={sortedTracks[currentTrack].fileUrl} 
                title={`${sortedTracks[currentTrack].trackNumber}. ${sortedTracks[currentTrack].title}`}
                artist={release.user.username}
                trackId={sortedTracks[currentTrack].id}
                listenCount={sortedTracks[currentTrack]._count.listens}
                onTrackEnd={handleTrackEnd}
                onNextTrack={handleNextTrack}
                onPrevTrack={handlePrevTrack}
                hasNextTrack={currentTrack < sortedTracks.length - 1}
                hasPrevTrack={currentTrack > 0}
                currentTrackIndex={currentTrack}
                totalTracks={sortedTracks.length}
                autoPlay={true}
                releaseId={release.id}
              />
            </div>

            {/* Track listing */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '10px' }}>Track List</h4>
              {sortedTracks.map((track, index) => {
                const isCurrentTrack = audioContext.currentTrackId === track.id
                
                return (
                  <div key={track.id}>
                    <div 
                      onClick={() => {
                        audioContext.setCurrentTrackId(track.id)
                        setCurrentTrack(index)
                        // Always trigger play when clicking a track
                        setTimeout(() => {
                          // Find and click the play button for this release's audio player
                          const playButton = document.querySelector(`[data-release-id="${release.id}"] .play-pause-btn`)
                          if (playButton) {
                            (playButton as HTMLElement).click()
                          }
                        }, 0)
                      }}
                      style={{
                        padding: '8px 12px',
                        margin: '2px 0',
                        backgroundColor: isCurrentTrack ? '#ffff00' : '#f5f5f5',
                        border: isCurrentTrack ? '2px solid #000' : '1px solid #ccc',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontFamily: 'Courier New, monospace',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentTrack) {
                          e.currentTarget.style.backgroundColor = '#e0e0e0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentTrack) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }
                      }}
                    >
                      <span>
                        {track.trackNumber}. {track.title}
                        {track.lyrics && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleLyrics(track.id)
                            }}
                            style={{
                              marginLeft: '8px',
                              color: '#0066cc',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontFamily: 'Courier New, monospace'
                            }}
                          >
                            lyrics
                          </span>
                        )}
                      </span>
                      <span style={{ color: '#666', fontSize: '11px' }}>
                        {track.duration ? formatDuration(track.duration) : '--'} • {track._count.listens} plays
                      </span>
                    </div>
                    
                    {expandedLyrics.has(track.id) && track.lyrics && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#f9f9f9',
                        border: '1px solid #ccc',
                        borderTop: 'none',
                        fontSize: '12px',
                        fontFamily: 'Courier New, monospace',
                        whiteSpace: 'pre-wrap',
                        color: '#333',
                        marginBottom: '2px'
                      }}>
                        {track.lyrics}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            border: '2px solid #000',
            textAlign: 'center',
            width: '100%',
            maxWidth: '320px',
            maxHeight: '90vh',
            fontFamily: 'Courier New, monospace',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Share this release</h3>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: '15px' 
            }}>
              <img 
                src={generateQRCode()} 
                alt="QR Code for release"
                style={{ 
                  width: '100%',
                  maxWidth: '200px',
                  height: 'auto',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
              Scan with your phone to share
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              justifyContent: 'center' 
            }}>
              <button
                onClick={downloadQRCode}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#4444ff',
                  color: 'white',
                  border: '1px solid #000',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                📥 Download
              </button>
              <button
                onClick={() => setShowQR(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#ddd',
                  color: 'black',
                  border: '1px solid #000',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
