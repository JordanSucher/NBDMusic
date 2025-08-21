"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface Track {
  id: string
  title: string
  fileUrl: string
  duration: number | null
}

export default function BackfillDurationPage() {
  const { data: session } = useSession()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState("")
  const [results, setResults] = useState<{
    processed: number
    successful: number
    failed: number
    errors: string[]
  } | null>(null)

  useEffect(() => {
    if (session) {
      fetchTracksWithoutDuration()
    }
  }, [session])

  const fetchTracksWithoutDuration = async () => {
    try {
      const response = await fetch('/api/admin/tracks-without-duration')
      if (response.ok) {
        const data = await response.json()
        setTracks(data.tracks)
      }
    } catch (error) {
      console.error("Failed to fetch tracks:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDuration = (fileUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      
      const handleLoadedMetadata = () => {
        cleanup()
        resolve(Math.floor(audio.duration))
      }
      
      const handleError = () => {
        cleanup()
        reject(new Error('Failed to load audio'))
      }
      
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('error', handleError)
      }
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('error', handleError)
      
      // Add timeout
      setTimeout(() => {
        cleanup()
        reject(new Error('Timeout loading audio'))
      }, 10000)
      
      audio.src = fileUrl
      audio.load()
    })
  }

  const updateTrackDuration = async (trackId: string, duration: number) => {
    const response = await fetch('/api/admin/update-track-duration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, duration })
    })
    
    if (!response.ok) {
      throw new Error('Failed to update track duration')
    }
  }

  const startBackfill = async () => {
    if (tracks.length === 0) return
    
    setProcessing(true)
    setResults({
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    })

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      setProgress(`Processing track ${i + 1} of ${tracks.length}: ${track.title}`)
      
      try {
        const duration = await calculateDuration(track.fileUrl)
        await updateTrackDuration(track.id, duration)
        
        setResults(prev => prev ? {
          ...prev,
          processed: prev.processed + 1,
          successful: prev.successful + 1
        } : null)
        
        console.log(`Successfully updated ${track.title}: ${duration} seconds`)
      } catch (error) {
        setResults(prev => prev ? {
          ...prev,
          processed: prev.processed + 1,
          failed: prev.failed + 1,
          errors: [...prev.errors, `${track.title}: ${error}`]
        } : null)
        
        console.error(`Failed to process ${track.title}:`, error)
      }
    }
    
    setProgress("Backfill completed!")
    setProcessing(false)
  }

  if (!session) {
    return (
      <div className="container">
        <h1>Backfill Duration Data</h1>
        <p>You must be logged in to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Backfill Duration Data</h1>
        <p>Loading tracks without duration data...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Backfill Duration Data</h1>
      
      <div className="mb-20">
        <p><strong>Found {tracks.length} tracks</strong> without duration data that need to be processed.</p>
        
        {tracks.length > 0 && (
          <>
            <p>This process will:</p>
            <ul>
              <li>Load each audio file to calculate its duration</li>
              <li>Update the database with the calculated duration</li>
              <li>Show progress as it processes each track</li>
            </ul>
            
            <button
              onClick={startBackfill}
              disabled={processing}
              style={{
                backgroundColor: processing ? '#ccc' : '#4444ff',
                color: 'white',
                padding: '8px 16px',
                border: '1px solid #000',
                cursor: processing ? 'not-allowed' : 'pointer',
                marginTop: '10px'
              }}
            >
              {processing ? 'Processing...' : 'Start Backfill Process'}
            </button>
          </>
        )}
      </div>

      {progress && (
        <div className="mb-10" style={{ 
          padding: '10px', 
          backgroundColor: '#f0f0f0', 
          border: '1px solid #ccc' 
        }}>
          {progress}
        </div>
      )}

      {results && (
        <div className="mb-20" style={{ 
          padding: '10px', 
          backgroundColor: '#f0f0f0', 
          border: '1px solid #ccc' 
        }}>
          <h3>Results:</h3>
          <ul>
            <li>Processed: {results.processed} tracks</li>
            <li>Successful: {results.successful}</li>
            <li>Failed: {results.failed}</li>
          </ul>
          
          {results.errors.length > 0 && (
            <div>
              <h4>Errors:</h4>
              <ul>
                {results.errors.map((error, index) => (
                  <li key={index} style={{ color: 'red', fontSize: '12px' }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tracks.length > 0 && (
        <div>
          <h3>Tracks to Process:</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {tracks.map((track, index) => (
              <div
                key={track.id}
                style={{
                  padding: '4px 8px',
                  margin: '2px 0',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ccc',
                  fontSize: '12px'
                }}
              >
                {index + 1}. {track.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}