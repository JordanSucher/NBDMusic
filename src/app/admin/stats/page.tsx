"use client"

import { useState, useEffect } from "react"

interface ListenerStat {
  listener: {
    username: string
    name: string | null
  }
  listenCount: number
  uniqueTracks: number
  uniqueArtists: number
  topArtist: {
    username: string
    name: string | null
    listenCount: number
  } | null
}

interface ArtistStat {
  artist: {
    username: string
    name: string | null
  }
  totalListens: number
  uniqueListeners: number
  topListener: {
    username: string
    name: string | null
    listenCount: number
  } | null
}

interface TrackStat {
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
  uniqueListeners?: number
}

interface AnonymousStats {
  totalListens: number
  topTracks: TrackStat[]
}

interface Overview {
  totalListens: number
  authenticatedListens: number
  anonymousListens: number
  anonymousPercentage: number
}

export default function AdminStatsPage() {
  const [listeners, setListeners] = useState<ListenerStat[]>([])
  const [artists, setArtists] = useState<ArtistStat[]>([])
  const [tracks, setTracks] = useState<TrackStat[]>([])
  const [anonymous, setAnonymous] = useState<AnonymousStats>({ totalListens: 0, topTracks: [] })
  const [overview, setOverview] = useState<Overview>({ totalListens: 0, authenticatedListens: 0, anonymousListens: 0, anonymousPercentage: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Filters
  const [timeRange, setTimeRange] = useState("7") // days
  const [artistFilter, setArtistFilter] = useState("")
  const [minListens, setMinListens] = useState("1")
  const [limit, setLimit] = useState("20")

  const timeRangeOptions = [
    { value: "1", label: "Last 24 hours" },
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
        limit: limit,
        minListens: minListens
      })

      if (artistFilter.trim()) {
        params.append('artistFilter', artistFilter.trim())
      }

      const response = await fetch(`/api/admin/listening-stats?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch listening stats')
      }

      const data = await response.json()
      setListeners(data.listeners)
      setArtists(data.artists)
      setTracks(data.tracks)
      setAnonymous(data.anonymous)
      setOverview(data.overview)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Failed to fetch listening stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatDisplayName = (username: string, name: string | null) => {
    return name ? `${name} (${username})` : username
  }

  return (
    <div className="container">
      <h1>Listening Statistics</h1>

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              Filter by Artist:
            </label>
            <input
              type="text"
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              placeholder="Username or display name"
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '14px',
                fontFamily: 'Courier New, monospace',
                border: '1px solid #ccc',
                borderRadius: '3px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Min Listens:
            </label>
            <input
              type="number"
              value={minListens}
              onChange={(e) => setMinListens(e.target.value)}
              min="1"
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '14px',
                fontFamily: 'Courier New, monospace',
                border: '1px solid #ccc',
                borderRadius: '3px'
              }}
            />
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
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
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

      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Overview */}
      {overview.totalListens > 0 && (
        <div style={{
          border: '2px solid #000',
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#fff'
        }}>
          <h2>Overview</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div>
              <strong>Total Listens:</strong><br />
              {overview.totalListens.toLocaleString()}
            </div>
            <div>
              <strong>Authenticated Users:</strong><br />
              {overview.authenticatedListens.toLocaleString()} ({Math.round((overview.authenticatedListens / overview.totalListens) * 100)}%)
            </div>
            <div>
              <strong>Anonymous Visitors:</strong><br />
              {overview.anonymousListens.toLocaleString()} ({overview.anonymousPercentage}%)
            </div>
          </div>
        </div>
      )}

      {/* Anonymous Listening */}
      {anonymous.totalListens > 0 && (
        <div style={{
          border: '2px solid #000',
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#fff'
        }}>
          <h2>Anonymous Listening</h2>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
            Tracks most popular with anonymous (non-logged-in) visitors
            {artistFilter && ` (filtered by artist: ${artistFilter})`}
          </p>
          
          {anonymous.topTracks.length === 0 ? (
            <p>No anonymous listens found for the selected criteria.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Rank</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Track</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Artist</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Release</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Anonymous Listens</th>
                  </tr>
                </thead>
                <tbody>
                  {anonymous.topTracks.map((track, index) => (
                    <tr key={track.track.id}>
                      <td style={{ padding: '8px' }}>#{index + 1}</td>
                      <td style={{ padding: '8px' }}>
                        <strong>{track.track.title}</strong>
                      </td>
                      <td style={{ padding: '8px' }}>
                        {formatDisplayName(track.track.artist.username, track.track.artist.name)}
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
      )}

      {/* Top Listeners */}
      <div style={{
        border: '2px solid #000',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#fff'
      }}>
        <h2>Top Listeners</h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
          Users who have listened to the most tracks
          {artistFilter && ` (filtered by artist: ${artistFilter})`}
        </p>
        
        {listeners.length === 0 ? (
          <p>No listeners found for the selected criteria.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Listener</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Total Listens</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Unique Tracks</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Unique Artists</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Top Artist Listened To</th>
                </tr>
              </thead>
              <tbody>
                {listeners.map((listener, index) => (
                  <tr key={listener.listener.username}>
                    <td style={{ padding: '8px' }}>#{index + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <strong>{formatDisplayName(listener.listener.username, listener.listener.name)}</strong>
                    </td>
                    <td style={{ padding: '8px' }}>{listener.listenCount.toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{listener.uniqueTracks}</td>
                    <td style={{ padding: '8px' }}>{listener.uniqueArtists}</td>
                    <td style={{ padding: '8px' }}>
                      {listener.topArtist ? (
                        <span>
                          {formatDisplayName(listener.topArtist.username, listener.topArtist.name)}
                          {' '}({listener.topArtist.listenCount} listens)
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          Artists with the most listens
        </p>
        
        {artists.length === 0 ? (
          <p>No artists found for the selected criteria.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Artist</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Total Listens</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Unique Listeners</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Top Listener</th>
                </tr>
              </thead>
              <tbody>
                {artists.map((artist, index) => (
                  <tr key={artist.artist.username}>
                    <td style={{ padding: '8px' }}>#{index + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <strong>{formatDisplayName(artist.artist.username, artist.artist.name)}</strong>
                    </td>
                    <td style={{ padding: '8px' }}>{artist.totalListens.toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{artist.uniqueListeners}</td>
                    <td style={{ padding: '8px' }}>
                      {artist.topListener ? (
                        <span>
                          {formatDisplayName(artist.topListener.username, artist.topListener.name)}
                          {' '}({artist.topListener.listenCount} listens)
                        </span>
                      ) : 'N/A'}
                    </td>
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
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
          Individual tracks with the most listens
          {artistFilter && ` (filtered by artist: ${artistFilter})`}
        </p>
        
        {tracks.length === 0 ? (
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
                  <th style={{ textAlign: 'left', padding: '8px' }}>Unique Listeners</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track, index) => (
                  <tr key={track.track.id}>
                    <td style={{ padding: '8px' }}>#{index + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <strong>{track.track.title}</strong>
                    </td>
                    <td style={{ padding: '8px' }}>
                      {formatDisplayName(track.track.artist.username, track.track.artist.name)}
                    </td>
                    <td style={{ padding: '8px' }}>{track.track.release.title}</td>
                    <td style={{ padding: '8px' }}>{track.listenCount.toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{track.uniqueListeners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p><strong>Note:</strong> Statistics are based on recorded listen events. A listen is counted when a user plays a track for a significant duration.</p>
        <p><strong>Anonymous vs Authenticated:</strong> Anonymous listens are from visitors who are not logged in. Authenticated listens are from registered users.</p>
      </div>
    </div>
  )
}