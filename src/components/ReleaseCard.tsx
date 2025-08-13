import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import AudioPlayer from "./AudioPlayer"

interface Track {
  id: string
  title: string
  trackNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  duration: number | null
  mimeType: string
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
  const [tagCounts, setTagCounts] = useState<TagWithCount[]>([])
  const [currentTrack, setCurrentTrack] = useState(0)

  useEffect(() => {
    fetchTagCounts()
  }, [])

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getTotalSize = () => {
    return release.tracks.reduce((total, track) => total + track.fileSize, 0)
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
    if (currentTrack < sortedTracks.length - 1) {
      setCurrentTrack(currentTrack + 1)
    }
  }

  const handlePrevTrack = () => {
    if (currentTrack > 0) {
      setCurrentTrack(currentTrack - 1)
    }
  }

  return (
    <div className="song-card">
      {/* Release Header with Artwork */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
        {/* Artwork */}
        {release.artworkUrl ? (
          <div style={{ flexShrink: 0 }}>
            <img 
              src={release.artworkUrl} 
              alt={`${release.title} artwork`}
              style={{ 
                width: '120px', 
                height: '120px', 
                objectFit: 'cover',
                border: '2px solid #000',
                backgroundColor: '#f0f0f0'
              }}
            />
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
            No Artwork
          </div>
        )}

        {/* Release Info */}
        <div style={{ flex: 1 }}>
          <div className="song-title">
            {release.title}
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
            </Link> | 
            {release.releaseDate && (
              <>
                {isScheduledRelease(release.releaseDate) ? 'Scheduled for' : 'Released'}: {formatReleaseDate(release.releaseDate)} | 
              </>
            )}
            {!release.releaseDate && <>Uploaded: {formatDate(release.uploadedAt)} | </>}
            {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''} | 
            Total size: {formatFileSize(getTotalSize())}
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
              {release.description}
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
                <span className="tag">
                  {releaseTag.tag.name} ({count})
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Track List */}
      {release.tracks.length === 1 ? (
        // Single track - show player directly
        <div style={{ marginTop: '10px' }}>
          <AudioPlayer 
            src={sortedTracks[0].fileUrl} 
            title={sortedTracks[0].title}
            artist={release.user.username}
            currentTrackIndex={0}
            totalTracks={1}
            releaseId={release.id}
          />
        </div>
      ) : (
        // Multiple tracks - show track list with player
        <div style={{ marginTop: '10px' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>Tracks:</strong>
          </div>

          {/* Current track player with auto-play support */}
          <AudioPlayer 
            src={sortedTracks[currentTrack].fileUrl} 
            title={`${sortedTracks[currentTrack].trackNumber}. ${sortedTracks[currentTrack].title}`}
            artist={release.user.username}
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

          {/* Track selection */}
          <div style={{ marginTop: '10px' }}>
            {sortedTracks.map((track, index) => {
              const isCurrentTrack = index === currentTrack
              
              return (
                <div 
                  key={track.id}
                  onClick={() => setCurrentTrack(index)}
                  style={{
                    padding: '4px 8px',
                    margin: '2px 0',
                    backgroundColor: isCurrentTrack ? '#ffff00' : '#f5f5f5',
                    border: isCurrentTrack ? '1px solid #000' : '1px solid #ccc',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: 'Courier New, monospace'
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
                  {track.trackNumber}. {track.title}
                  <span style={{ float: 'right', color: '#666' }}>
                    {formatFileSize(track.fileSize)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
              backgroundColor: '#4444ff',
              color: 'white',
              fontSize: '12px',
              padding: '4px 8px',
              textDecoration: 'none',
              marginRight: '8px',
              border: '1px solid #000'
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
                border: '1px solid #000',
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
