"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface UserStats {
  user: {
    username: string
    name: string | null
  }
  stats: {
    totalListens: number
    uniqueTracks: number
    uniqueArtists: number
    topArtists: Array<{
      artist: {
        username: string
        name: string | null
      }
      listenCount: number
    }>
    topTracks: Array<{
      track: {
        id: string
        title: string
        artist: {
          username: string
          name: string | null
        }
        release: {
          title: string
        }
      }
      listenCount: number
    }>
    dailyActivity: Record<string, number>
  }
  filters: {
    days: number
    limit: number
  }
}

export default function UserStatsPage() {
  const params = useParams()
  const username = params.username as string
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Filters
  const [timeRange, setTimeRange] = useState("7") // days
  const [limit, setLimit] = useState("10")

  const timeRangeOptions = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "365", label: "Last year" },
    { value: "0", label: "All time" }
  ]

  const fetchStats = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({
        days: timeRange,
        limit: limit
      })

      const response = await fetch(`/api/user-stats/${username}?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Failed to fetch user stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [username])

  const formatDisplayName = (username: string, name: string | null) => {
    return name ? `${name} (${username})` : username
  }

  if (loading && !stats) {
    return (
      <div className="container">
        <h1>Loading stats for @{username}...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <h1>Error</h1>
        <div className="error">{error}</div>
        <Link href={`/user/${username}`}>← Back to Profile</Link>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container">
        <h1>No stats available</h1>
        <Link href={`/user/${username}`}>← Back to Profile</Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <Link href={`/user/${username}`} style={{ fontSize: '14px' }}>
          ← Back to Profile
        </Link>
      </div>
      
      <h1>Stats for {formatDisplayName(stats.user.username, stats.user.name)}</h1>

      {/* Filters */}
      <div style={{
        border: '2px solid #000',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#fff'
      }}>
        <h2>Filters</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '15px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Time Range:
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '14px',
                fontFamily: 'Courier New, monospace',
                border: '1px solid #ccc',
                borderRadius: '3px',
                backgroundColor: '#fff'
              }}
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Results Limit:
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '14px',
                fontFamily: 'Courier New, monospace',
                border: '1px solid #ccc',
                borderRadius: '3px',
                backgroundColor: '#fff'
              }}
            >
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Courier New, monospace',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: loading ? '#f5f5f5' : '#fff'
          }}
        >
          {loading ? 'Loading...' : 'Update Stats'}
        </button>
      </div>

      {/* Overview */}
      <div style={{
        border: '2px solid #000',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#fff'
      }}>
        <h2>Overview</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <strong>Total Listens:</strong><br />
            {stats.stats.totalListens.toLocaleString()}
          </div>
          <div>
            <strong>Unique Tracks:</strong><br />
            {stats.stats.uniqueTracks.toLocaleString()}
          </div>
          <div>
            <strong>Unique Artists:</strong><br />
            {stats.stats.uniqueArtists.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Top Artists */}
      <div style={{
        border: '2px solid #000',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#fff'
      }}>
        <h2>Top Artists</h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
          Artists this user listens to most
        </p>
        
        {stats.stats.topArtists.length === 0 ? (
          <p>No artists found for the selected criteria.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Artist</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Listens</th>
                </tr>
              </thead>
              <tbody>
                {stats.stats.topArtists.map((artist, index) => (
                  <tr key={artist.artist.username}>
                    <td style={{ padding: '8px' }}>#{index + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <Link href={`/user/${artist.artist.username}`}>
                        <strong>{formatDisplayName(artist.artist.username, artist.artist.name)}</strong>
                      </Link>
                    </td>
                    <td style={{ padding: '8px' }}>{artist.listenCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Tracks */}
      <div style={{
        border: '2px solid #000',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#fff'
      }}>
        <h2>Top Tracks</h2>
        <p style={{ fontSize: '12px', color: '666', marginBottom: '15px' }}>
          Individual tracks this user listens to most
        </p>
        
        {stats.stats.topTracks.length === 0 ? (
          <p>No tracks found for the selected criteria.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Track</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Artist</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Release</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Listens</th>
                </tr>
              </thead>
              <tbody>
                {stats.stats.topTracks.map((track, index) => (
                  <tr key={track.track.id}>
                    <td style={{ padding: '8px' }}>#{index + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <strong>{track.track.title}</strong>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Link href={`/user/${track.track.artist.username}`}>
                        {formatDisplayName(track.track.artist.username, track.track.artist.name)}
                      </Link>
                    </td>
                    <td style={{ padding: '8px' }}>{track.track.release.title}</td>
                    <td style={{ padding: '8px' }}>{track.listenCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p><strong>Note:</strong> Statistics are based on recorded listen events from this user's activity.</p>
      </div>
    </div>
  )
}