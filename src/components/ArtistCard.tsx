"use client"

import Link from "next/link"
import FollowButton from "./FollowButton"
import { createReleaseUrl } from "@/utils/slugify"

interface Artist {
  id: string
  username: string
  name: string | null
  releaseCount: number
  followerCount: number
  totalTracks: number
  latestRelease: {
    id: string
    title: string
    releaseType: string
    artworkUrl: string | null
    uploadedAt: string
    releaseDate: string | null
  } | null
}

interface ArtistCardProps {
  artist: Artist
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const isScheduledRelease = (releaseDate: string | null) => {
    if (!releaseDate) return false
    return new Date(releaseDate) > new Date()
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

  return (
    <div className="song-card">
      <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
        {/* Artist Avatar / Latest Release Artwork */}
        <div style={{ flexShrink: 0 }}>
          <Link href={`/user/${encodeURIComponent(artist.username)}`}>
            {artist.latestRelease?.artworkUrl ? (
              <img 
                src={artist.latestRelease.artworkUrl} 
                alt={`${artist.username}'s latest release`}
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  objectFit: 'cover',
                  border: '2px solid #000',
                  backgroundColor: '#f0f0f0',
                  cursor: 'pointer'
                }}
              />
            ) : (
              <div style={{ 
                width: '120px', 
                height: '120px', 
                border: '2px solid #000', 
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: '#666',
                textAlign: 'center',
                cursor: 'pointer'
              }}>
                {artist.username.substring(0, 2).toUpperCase()}
              </div>
            )}
          </Link>
        </div>

        {/* Artist Info */}
        <div style={{ flex: 1 }}>
          <div className="song-title">
            <Link 
              href={`/user/${encodeURIComponent(artist.username)}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                marginRight: '8px'
              }}
            >
              {artist.name || artist.username}
            </Link>
            {artist.name && (
              <span style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginLeft: '8px',
                fontWeight: 'normal'
              }}>
                @{artist.username}
              </span>
            )}
            
            <FollowButton 
            username={artist.username} 
            variant="link" />

          </div>
          
          <div className="song-meta">
            {artist.releaseCount} release{artist.releaseCount !== 1 ? 's' : ''} • {artist.totalTracks} track{artist.totalTracks !== 1 ? 's' : ''}
          </div>

          {/* Latest Release Info */}
          {artist.latestRelease && (
            <div style={{ 
              fontSize: '12px', 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f9f9f9',
              border: '1px solid #ddd'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                Latest Release:
              </div>
              <Link 
                href={createReleaseUrl(artist.latestRelease.id, artist.latestRelease.title, artist.username)}
                style={{ 
                  textDecoration: 'none', 
                  color: 'inherit',
                  display: 'block',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  const linkElement = e.currentTarget as HTMLElement
                  linkElement.style.backgroundColor = '#e8e8e8'
                  const titleSpan = linkElement.querySelector('span') as HTMLElement
                  if (titleSpan) {
                    titleSpan.style.textDecoration = 'underline'
                    titleSpan.style.color = '#0066cc'
                  }
                }}
                onMouseLeave={(e) => {
                  const linkElement = e.currentTarget as HTMLElement
                  linkElement.style.backgroundColor = 'transparent'
                  const titleSpan = linkElement.querySelector('span') as HTMLElement
                  if (titleSpan) {
                    titleSpan.style.textDecoration = 'none'
                    titleSpan.style.color = 'inherit'
                  }
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <span style={{ transition: 'all 0.2s ease' }}>
                    {artist.latestRelease.title}
                  </span>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 4px', 
                    backgroundColor: '#ddd',
                    border: '1px solid #999'
                  }}>
                    {getReleaseTypeLabel(artist.latestRelease.releaseType)}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                  {artist.latestRelease.releaseDate && !isScheduledRelease(artist.latestRelease.releaseDate) ? 
                    `Released: ${formatDate(artist.latestRelease.releaseDate)}` :
                    `Uploaded: ${formatDate(artist.latestRelease.uploadedAt)}`
                  }
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
