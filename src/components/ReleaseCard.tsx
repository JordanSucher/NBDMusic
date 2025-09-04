import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import AudioPlayer from "./AudioPlayer"
import FollowButton from "./FollowButton"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"
import { persistentAudioPlayer } from "@/lib/PersistentAudioPlayer"
import { createReleaseUrl } from "@/utils/slugify"

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

interface TagWithCount {
  name: string
  count: number
}

interface ReleaseCardProps {
  release: {
    id: string
    title: string
    description: string | null
    releaseType: string
    releaseDate: string | null
    artworkUrl: string | null
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
  onDelete?: (releaseId: string) => void
  isDeleting?: boolean
}

export default function ReleaseCard({ release, onDelete, isDeleting }: ReleaseCardProps) {
  const { data: session } = useSession()
  const queueAudio = useQueueAudioContext()
  const [tagCounts, setTagCounts] = useState<TagWithCount[]>([])
  const [currentTrack, setCurrentTrack] = useState(0)
  const [playerKey, setPlayerKey] = useState(0)
  const [expandedLyrics, setExpandedLyrics] = useState<{[trackId: string]: boolean}>({})
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)


  useEffect(() => {
    fetchTagCounts()
  }, [])

  // Sync local currentTrack state with global queue when it changes
  useEffect(() => {
    if (queueAudio.currentTrack && queueAudio.currentTrack.releaseId === release.id) {
      // Sort tracks and find the index of the currently playing track in this release
      const tracks = [...release.tracks].sort((a, b) => a.trackNumber - b.trackNumber)
      const trackIndex = tracks.findIndex(track => track.id === queueAudio.currentTrack?.id)
      if (trackIndex !== -1) {
        setCurrentTrack(trackIndex)
      }
    }
  }, [queueAudio.currentTrack, release.tracks, release.id])

  // Sync immediately on mount before browser paint to avoid flash
  useLayoutEffect(() => {
    if (queueAudio.currentTrack && queueAudio.currentTrack.releaseId === release.id) {
      const tracks = [...release.tracks].sort((a, b) => a.trackNumber - b.trackNumber)
      const trackIndex = tracks.findIndex(track => track.id === queueAudio.currentTrack?.id)
      if (trackIndex !== -1) {
        setCurrentTrack(trackIndex)
      }
    }
  }, [queueAudio.currentTrack, release.tracks])

  const isScheduledRelease = (releaseDate: string | null) => {
    if (!releaseDate) return false
    return new Date(releaseDate) > new Date()
  }

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }


  const fetchTagCounts = async () => {
    try {
      const response = await fetch('/api/tags/counts')
      if (response.ok) {
        const data = await response.json()
        setTagCounts(data.tags)
      }
    } catch (err) {
      console.error("Failed to load tag counts:", err)
    }
  }

  const getTagCount = (tagName: string) => {
    const tagData = tagCounts.find(t => t.name === tagName)
    return tagData?.count || 0
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTotalDuration = () => {
    return release.tracks.reduce((total, track) => total + (track.duration || 0), 0)
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

  const sortedTracks = [...release.tracks].sort((a, b) => a.trackNumber - b.trackNumber)
  
  // Compute the actual current track based on queue state
  const actualCurrentTrack = (() => {
    if (queueAudio.currentTrack && queueAudio.currentTrack.releaseId === release.id) {
      const trackIndex = sortedTracks.findIndex(track => track.id === queueAudio.currentTrack?.id)
      return trackIndex !== -1 ? trackIndex : 0
    }
    return 0  // Default to first track if no queue or different release
  })()

  // Check if current user owns this release
  const isOwner = session?.user && 
    (session.user.name === release.user.username || session.user.email === release.user.username)

  const handleDelete = () => {
    if (!onDelete || !isOwner) return
    
    if (confirm("Are you sure you want to delete this release? This will delete all tracks and cannot be undone.")) {
      onDelete(release.id)
    }
  }

  const handleTrackEnd = () => {
    // Auto-advance to next track if there is one
    if (currentTrack < sortedTracks.length - 1) {
      setCurrentTrack(currentTrack + 1)
    }
  }

  const handleNextTrack = () => {
    console.log('🔄 handleNextTrack called')
    queueAudio.nextTrack()
  }

  const handlePrevTrack = () => {
    console.log('🔄 handlePrevTrack called')
    queueAudio.prevTrack()
  }

  const toggleLyrics = (trackId: string) => {
    setExpandedLyrics(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }))
  }

  const parseTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0000ff',
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  const getTruncatedDescription = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    
    const urlRegex = /(https?:\/\/[^\s]+)/g
    let truncated = text.slice(0, maxLength)
    let needsEllipsis = true
    
    // Check if we cut off in the middle of a URL
    const lastUrlMatch = [...text.matchAll(urlRegex)].reverse().find(match => {
      const urlStart = match.index!
      const urlEnd = urlStart + match[0].length
      return urlStart < maxLength && urlEnd > maxLength
    })
    
    if (lastUrlMatch) {
      // If we cut a URL, include the complete URL instead
      const urlEnd = lastUrlMatch.index! + lastUrlMatch[0].length
      truncated = text.slice(0, urlEnd)
      
      // If we've included the complete text by rounding up, no ellipsis needed
      if (urlEnd >= text.length) {
        needsEllipsis = false
      }
    }
    
    return truncated + (needsEllipsis ? '...' : '')
  }

  return (
    <div className="song-card">
      {/* Release Header with Artwork */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
        {/* Artwork */}
        {release.artworkUrl ? (
          <div style={{ flexShrink: 0 }}>
            <Link href={createReleaseUrl(release.id, release.title, release.user.username)}>
              <img 
                src={release.artworkUrl} 
                alt={`${release.title} artwork`}
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  objectFit: 'cover',
                  border: '2px solid #000',
                  backgroundColor: '#f0f0f0',
                  cursor: 'pointer'
                }}
              />
            </Link>
          </div>
        ) : (
          <div style={{ 
            width: '120px', 
            height: '120px', 
            flexShrink: 0,
            border: '2px solid #000', 
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: '#666',
            textAlign: 'center'
          }}>
            <Link 
              href={createReleaseUrl(release.id, release.title, release.user.username)}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: '#666',
                cursor: 'pointer'
              }}
            >
              No Artwork
            </Link>
          </div>
        )}

        {/* Release Info */}
        <div style={{ 
          flex: 1,
          minWidth: 0,
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}>
          <div className="song-title">
            <Link 
              href={createReleaseUrl(release.id, release.title, release.user.username)}
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              {release.title}
            </Link>
            <span style={{ 
              fontSize: '11px', 
              marginLeft: '10px', 
              padding: '2px 4px', 
              backgroundColor: '#ddd',
              border: '1px solid #999'
            }}>
              {getReleaseTypeLabel(release.releaseType)}
            </span>
          </div>
          
          <div className="song-meta">
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
            {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
            <br />
            Total duration: {formatDuration(getTotalDuration())}
            {isScheduledRelease(release.releaseDate) && (
              <span style={{ 
                marginLeft: '10px',
                padding: '2px 4px',
                backgroundColor: '#ff9900',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                SCHEDULED
              </span>
            )}
          </div>

          {release.description && (
          <div style={{ 
            fontSize: '13px', 
            marginTop: '5px',
            fontStyle: 'italic',
            color: '#555'
          }}>
            <div
              style={{ 
                marginBottom: '5px',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
{isDescriptionExpanded 
                ? parseTextWithLinks(release.description)
                : parseTextWithLinks(getTruncatedDescription(release.description, 120))
              }
            </div>
            {release.description.length > 120 && (
              <span
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'blue',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'Courier New, monospace',
                  marginTop: '4px',
                  padding: '0'
                }}
              >
                {isDescriptionExpanded ? 'less' : 'more'}
              </span>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Tags */}
      {release.tags.length > 0 && (
        <div className="song-tags">
          Tags: {release.tags.map(releaseTag => {
            const count = getTagCount(releaseTag.tag.name)
            return (
              <Link
                key={releaseTag.tag.name}
                href={`/browse?tag=${encodeURIComponent(releaseTag.tag.name)}`}
                className="tag-link"
                style={{ textDecoration: 'none' }}
              >
                <span 
                  className="tag"
                  style={{
                    backgroundColor: '#f0f0f0',
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0h1v1H0V0zm2 2h1v1H2V2z' fill='%23ccc'/%3e%3c/svg%3e")`,
                    backgroundRepeat: 'repeat',
                    color: '#333',
                    border: '1px solid #999'
                  }}
                >
                  {releaseTag.tag.name} ({count})
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Track List */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Tracks:</strong>
        </div>

          {/* Current track player with auto-play support */}
          <div data-release-id={release.id}>
            <AudioPlayer 
              key={playerKey}
              src={sortedTracks[actualCurrentTrack].fileUrl} 
              title={`${sortedTracks[actualCurrentTrack].trackNumber}. ${sortedTracks[actualCurrentTrack].title}`}
              artist={release.user.username}
              trackId={sortedTracks[actualCurrentTrack].id}
              listenCount={sortedTracks[actualCurrentTrack]._count.listens}
              onTrackEnd={handleTrackEnd}
              onNextTrack={handleNextTrack}
              onPrevTrack={handlePrevTrack}
              hasNextTrack={actualCurrentTrack < sortedTracks.length - 1}
              hasPrevTrack={actualCurrentTrack > 0}
              currentTrackIndex={actualCurrentTrack}
              totalTracks={sortedTracks.length}
              autoPlay={true}
              releaseId={release.id}
            />
          </div>

          {/* Track selection */}
          <div style={{ marginTop: '10px' }}>
            {sortedTracks.map((track, index) => {
              // Highlight if this track is the globally current track
              const isActiveGlobalTrack = queueAudio.currentTrack?.id === track.id
              
              return (
                <div key={track.id}>
                  <div 
                    onClick={async () => {
                      console.log('🎮 Track clicked:', track.title, 'index:', index)
                      // Create or switch to release queue and go to this track
                      if (!queueAudio.currentQueue || queueAudio.currentQueue.originalSource?.id !== release.id) {
                        // Create new release queue
                        await queueAudio.playRelease(release.id, index)
                      } else {
                        // Already have this release queue, just go to track
                        queueAudio.goToTrack(index)
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      margin: '2px 0',
                      backgroundColor: isActiveGlobalTrack ? '#ffff00' : '#f5f5f5',
                      border: isActiveGlobalTrack ? '1px solid #000' : '1px solid #ccc',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'Courier New, monospace',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                      flexWrap: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActiveGlobalTrack) {
                        e.currentTarget.style.backgroundColor = '#e0e0e0'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActiveGlobalTrack) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }
                    }}
                  >
                  <span style={{ 
                    flex: '1', 
                    minWidth: '0', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis'
                  }}>
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
                        title="Toggle lyrics"
                      >
                      lyrics
                      </span>
                    )}
                  </span>
                  <div style={{ 
                    color: '#666', 
                    fontSize: '11px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    fontFamily: 'Courier New, monospace'
                  }}>
                    <span style={{ display: 'inline-block', width: '35px', textAlign: 'right' }}>
                      {track.duration ? formatDuration(track.duration) : '--'}
                    </span>
                    {' • '}
                    <span style={{ display: 'inline-block', width: '60px', textAlign: 'right' }}>
                      {track._count.listens} plays
                    </span>
                  </div>
                  </div>
                  {track.lyrics && expandedLyrics[track.id] && (
                    <div style={{
                      padding: '8px',
                      margin: '2px 0',
                      backgroundColor: '#f9f9f9',
                      border: '1px solid #ddd',
                      fontSize: '11px',
                      fontFamily: 'Courier New, monospace',
                      whiteSpace: 'pre-wrap',
                      color: '#444'
                    }}>
                      {track.lyrics}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      {/* Owner Actions */}
      {isOwner && (
        <div style={{ 
          textAlign: 'right', 
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid #ccc'
        }}>
          <Link 
            href={`/edit/${release.id}`}
            style={{
              display: 'inline-block',
              backgroundColor: '#4444ff',
              color: 'white',
              fontSize: '12px',
              padding: '4px 8px',
              textDecoration: 'none',
              marginRight: '8px',
              border: '2px outset #4444ff',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace'
            }}
          >
            Edit Release
          </Link>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                backgroundColor: '#ff4444',
                color: 'white',
                fontSize: '12px',
                padding: '4px 8px',
                border: '2px outset #ff4444',
                cursor: isDeleting ? 'not-allowed' : 'pointer'
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Release"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
