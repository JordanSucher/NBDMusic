"use client"

import { useState } from "react"

interface Track {
  id: string
  title: string
  trackNumber: number
}

interface Release {
  id: string
  title: string
  user: {
    username: string
  }
  tracks: Track[]
}

interface TrackNumberIssue {
  release: Release
  expectedNumbers: number[]
  actualNumbers: number[]
  missingNumbers: number[]
  duplicateNumbers: number[]
}

export default function BackfillTrackNumbersPage() {
  const [issues, setIssues] = useState<TrackNumberIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState<string[]>([]) // Array of release IDs being fixed
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const scanForIssues = async () => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/admin/track-number-issues')
      if (!response.ok) {
        throw new Error('Failed to scan for track number issues')
      }

      const data = await response.json()
      setIssues(data.issues)
      setSuccess(`Found ${data.issues.length} releases with track numbering issues`)
    } catch (error) {
      console.error('Error scanning for issues:', error)
      setError('Failed to scan for track number issues')
    } finally {
      setLoading(false)
    }
  }

  const fixReleaseNumbers = async (release: Release) => {
    setFixing(prev => [...prev, release.id])
    setError("")

    try {
      const response = await fetch('/api/admin/fix-track-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          releaseId: release.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fix track numbers')
      }

      const data = await response.json()
      console.log(`✅ Fixed track numbers for ${release.title}:`, data.updates)
      
      // Remove this release from the issues list
      setIssues(prev => prev.filter(issue => issue.release.id !== release.id))
      setSuccess(`Successfully fixed track numbers for "${release.title}"`)

    } catch (error) {
      console.error('Error fixing track numbers:', error)
      setError(`Failed to fix track numbers for "${release.title}"`)
    } finally {
      setFixing(prev => prev.filter(id => id !== release.id))
    }
  }

  const getIssueDescription = (issue: TrackNumberIssue) => {
    const descriptions = []
    
    if (issue.duplicateNumbers.length > 0) {
      descriptions.push(`Duplicate track numbers: ${issue.duplicateNumbers.join(', ')}`)
    }
    
    if (issue.missingNumbers.length > 0) {
      descriptions.push(`Missing track numbers: ${issue.missingNumbers.join(', ')}`)
    }
    
    const actualRange = `${Math.min(...issue.actualNumbers)}-${Math.max(...issue.actualNumbers)}`
    const expectedRange = `1-${issue.expectedNumbers.length}`
    
    if (actualRange !== expectedRange) {
      descriptions.push(`Range is ${actualRange}, should be ${expectedRange}`)
    }

    return descriptions.join('; ')
  }

  return (
    <div className="container">
      <h1>Backfill Track Numbers</h1>

      <p>
        This tool identifies releases with non-sequential track numbering (e.g., 1,2,4,5 instead of 1,2,3,4)
        and allows you to renumber them sequentially based on their current order in the database.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={scanForIssues}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            marginRight: '10px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Scanning...' : 'Scan for Track Number Issues'}
        </button>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="success" style={{ marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {issues.length > 0 && (
        <div>
          <h2>Releases with Track Number Issues ({issues.length})</h2>
          
          {issues.map(issue => (
            <div
              key={issue.release.id}
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <strong>{issue.release.title}</strong> by {issue.release.user.username}
              </div>
              
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                {getIssueDescription(issue)}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Current track numbers:</strong> {issue.actualNumbers.join(', ')}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Tracks:</strong>
                <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                  {issue.release.tracks.map(track => (
                    <li key={track.id} style={{ fontSize: '11px', marginBottom: '2px' }}>
                      {track.trackNumber}. {track.title}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => fixReleaseNumbers(issue.release)}
                disabled={fixing.includes(issue.release.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: fixing.includes(issue.release.id) ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  cursor: fixing.includes(issue.release.id) ? 'not-allowed' : 'pointer'
                }}
              >
                {fixing.includes(issue.release.id) ? 'Fixing...' : 'Fix Track Numbers (1,2,3...)'}
              </button>
            </div>
          ))}
        </div>
      )}

      {issues.length === 0 && !loading && success && (
        <div style={{ padding: '20px', backgroundColor: '#e8f5e8', border: '1px solid #4CAF50' }}>
          <strong>✅ No track numbering issues found!</strong>
          <p>All releases have sequential track numbering.</p>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <h3>How it works:</h3>
        <ul>
          <li>Scans all releases for non-sequential track numbers</li>
          <li>Identifies missing numbers, duplicates, and gaps</li>
          <li>Renumbers tracks sequentially (1,2,3...) based on their current database order</li>
          <li>Preserves the existing track order, just fixes the numbering</li>
        </ul>
      </div>
    </div>
  )
}