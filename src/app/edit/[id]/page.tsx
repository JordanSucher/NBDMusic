"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import ReleaseForm from "@/components/ReleaseForm"
import { createReleaseUrl } from "@/utils/slugify"

interface TagWithCount {
  name: string
  count: number
}

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
}

interface TrackUpdate {
  id?: string
  file?: File
  title: string
  trackNumber: number
  lyrics: string
  fileName?: string
  fileUrl?: string
  fileSize?: number
  mimeType?: string
  isNew?: boolean
  toDelete?: boolean
}

export default function EditReleasePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const releaseId = params.id as string
  
  // Release info
  const [releaseTitle, setReleaseTitle] = useState("")
  const [releaseDescription, setReleaseDescription] = useState("")
  const [releaseDate, setReleaseDate] = useState("")
  const [releaseType, setReleaseType] = useState("single")
  const [artistName, setArtistName] = useState("")
  const [tags, setTags] = useState("")
  
  // Artwork
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  const [currentArtworkUrl, setCurrentArtworkUrl] = useState<string | null>(null)
  const [removeCurrentArtwork, setRemoveCurrentArtwork] = useState(false)
  
  // Track info
  const [tracks, setTracks] = useState<TrackUpdate[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Tag suggestions
  const [availableTags, setAvailableTags] = useState<TagWithCount[]>([])

  // Load release data
  useEffect(() => {
    const fetchRelease = async () => {
      try {
        const response = await fetch(`/api/releases/${releaseId}`)
        if (response.ok) {
          const data = await response.json()
          const release = data.release
          
          setReleaseTitle(release.title)
          setReleaseDescription(release.description || "")
          setReleaseType(release.releaseType)
          setCurrentArtworkUrl(release.artworkUrl)
          setReleaseDate(release.releaseDate ? formatDateForInput(new Date(release.releaseDate)) : "")
          setArtistName(release.user.username)
          
          // Set existing tracks
          const existingTracks: TrackUpdate[] = release.tracks.map((track: Track) => ({
            id: track.id,
            title: track.title,
            trackNumber: track.trackNumber,
            lyrics: track.lyrics || "",
            fileName: track.fileName,
            fileUrl: track.fileUrl,
            fileSize: track.fileSize,
            mimeType: track.mimeType,
            isNew: false,
            toDelete: false
          }))
          
          setTracks(existingTracks)
          
          // Set tags
          const tagNames = release.tags?.map((rt: { tag: { name: string } }) => rt.tag.name) || []
          setTags(tagNames.join(', '))
          
        } else if (response.status === 404) {
          setError("Release not found")
        } else {
          setError("Failed to load release")
        }
      } catch (err) {
        console.error("Failed to fetch release:", err)
        setError("Something went wrong")
      } finally {
        setLoading(false)
      }
    }
    
    if (releaseId) {
      fetchRelease()
    }
  }, [releaseId])

  // Load available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags/counts')
        if (response.ok) {
          const data = await response.json()
          setAvailableTags(data.tags)
        }
      } catch (err) {
        console.error("Failed to load tags:", err)
      }
    }
    fetchTags()
  }, [])

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const cleanFileName = (fileName: string) => {
    return fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  const handleArtworkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setArtworkFile(null)
      setArtworkPreview(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      setError("Please select an image file (JPG, PNG, GIF)")
      return
    }

    setArtworkFile(file)
    setArtworkPreview(URL.createObjectURL(file))
    setError("")
  }

  const handleRemoveCurrentArtwork = () => {
    setRemoveCurrentArtwork(true)
    setCurrentArtworkUrl(null)
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    const newTracks: TrackUpdate[] = files.map((file) => ({
      file,
      title: cleanFileName(file.name),
      trackNumber: 1, // Temporary number, will be renumbered below
      lyrics: "",
      isNew: true,
      toDelete: false
    }))
    
    setTracks(prev => {
      // Combine existing tracks with new tracks
      const allTracks = [...prev, ...newTracks]
      
      // Renumber all non-deleted tracks sequentially
      let trackNumber = 1
      return allTracks.map(track => {
        if (track.toDelete) {
          return track // Keep deleted tracks with their original numbers
        } else {
          return { ...track, trackNumber: trackNumber++ }
        }
      })
    })
    
    setError("")
  }

  const updateTrackTitle = (index: number, newTitle: string) => {
    setTracks(prev => prev.map((track, i) => 
      i === index ? { ...track, title: newTitle } : track
    ))
  }

  const updateTrackLyrics = (index: number, newLyrics: string) => {
    setTracks(prev => prev.map((track, i) => 
      i === index ? { ...track, lyrics: newLyrics } : track
    ))
  }

  const markTrackForDeletion = (index: number) => {
    setTracks(prev => {
      // Toggle the deletion mark
      const updatedTracks = prev.map((track, i) => 
        i === index ? { ...track, toDelete: !track.toDelete } : track
      )
      
      // Renumber all non-deleted tracks sequentially
      let trackNumber = 1
      return updatedTracks.map(track => {
        if (track.toDelete) {
          return track // Keep deleted tracks with their original numbers for API consistency
        } else {
          return { ...track, trackNumber: trackNumber++ }
        }
      })
    })
  }

  const removeNewTrack = (index: number) => {
    setTracks(prev => {
      const newTracks = prev.filter((_, i) => i !== index)
      
      // Renumber all non-deleted tracks sequentially
      let trackNumber = 1
      return newTracks.map(track => {
        if (track.toDelete) {
          return track // Keep deleted tracks with their original numbers
        } else {
          return { ...track, trackNumber: trackNumber++ }
        }
      })
    })
  }

  const moveTrackUp = (index: number) => {
    if (index === 0) return
    
    setTracks(prev => {
      const newTracks = [...prev]
      const temp = newTracks[index]
      newTracks[index] = newTracks[index - 1]
      newTracks[index - 1] = temp
      
      // Renumber all non-deleted tracks sequentially
      let trackNumber = 1
      return newTracks.map(track => {
        if (track.toDelete) {
          return track // Keep deleted tracks with their original numbers
        } else {
          return { ...track, trackNumber: trackNumber++ }
        }
      })
    })
  }

  const moveTrackDown = (index: number) => {
    setTracks(prev => {
      if (index === prev.length - 1) return prev
      
      const newTracks = [...prev]
      const temp = newTracks[index]
      newTracks[index] = newTracks[index + 1]
      newTracks[index + 1] = temp
      
      // Renumber all non-deleted tracks sequentially
      let trackNumber = 1
      return newTracks.map(track => {
        if (track.toDelete) {
          return track // Keep deleted tracks with their original numbers
        } else {
          return { ...track, trackNumber: trackNumber++ }
        }
      })
    })
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    setError("")

    try {
      const response = await fetch(`/api/releases/${releaseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess("Release deleted successfully!")
        setTimeout(() => {
          router.push('/profile')
        }, 1500)
      } else {
        const data = await response.json()
        setError(data.error || "Delete failed")
      }
    } catch {
      setError("Something went wrong during deletion")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // Function to sanitize filenames for safe uploading
  const sanitizeFilename = (filename: string): string => {
    // Get file extension
    const extension = filename.substring(filename.lastIndexOf('.'))
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'))
    
    // Replace problematic characters with safe alternatives
    const sanitized = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_') // Replace any non-alphanumeric with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    
    return `${sanitized}${extension.toLowerCase()}`
  }

  // Function to upload file directly to blob storage
  const uploadFileDirectly = async (file: File, fileType: 'track' | 'artwork'): Promise<string> => {
    try {
      const { upload } = await import('@vercel/blob/client')
      
      // Generate unique filename with sanitized name
      const timestamp = Date.now()
      const folder = fileType === 'artwork' ? 'artwork' : 'tracks'
      const sanitizedName = sanitizeFilename(file.name)
      const filename = `${folder}/${timestamp}-${sanitizedName}`

      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload'
      })

      return blob.url
    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // Upload new artwork if provided
      let artworkUrl = currentArtworkUrl
      if (removeCurrentArtwork) {
        artworkUrl = null
      }
      if (artworkFile) {
        artworkUrl = await uploadFileDirectly(artworkFile, 'artwork')
      }

      // Process existing tracks
      const existingTracks = tracks.filter(track => !track.isNew)
      const existingTracksData = existingTracks.map(track => ({
        id: track.id!,
        title: track.title.trim(),
        trackNumber: track.trackNumber,
        lyrics: track.lyrics.trim(),
        toDelete: track.toDelete || false
      }))

      // Upload new track files and prepare data
      const newTracks = tracks.filter(track => track.isNew && !track.toDelete)
      const newTracksData = []

      for (let i = 0; i < newTracks.length; i++) {
        const track = newTracks[i]
        const fileUrl = await uploadFileDirectly(track.file!, 'track')
        
        newTracksData.push({
          title: track.title.trim(),
          trackNumber: track.trackNumber,
          fileName: track.file!.name,
          fileUrl,
          fileSize: track.file!.size,
          mimeType: track.file!.type,
          lyrics: track.lyrics.trim()
        })
      }

      // Send JSON data
      const requestData = {
        releaseTitle: releaseTitle.trim(),
        releaseDescription: releaseDescription.trim(),
        releaseType,
        tags: tags.trim(),
        releaseDate: releaseDate || null,
        artworkUrl,
        removeCurrentArtwork,
        existingTracks: existingTracksData,
        newTracks: newTracksData
      }

      const response = await fetch(`/api/releases/${releaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Save failed')
      }

      setSuccess("Release updated successfully!")
      
      // Redirect back to release page
      setTimeout(() => {
        const releaseUrl = createReleaseUrl(releaseId, releaseTitle, artistName)
        router.push(releaseUrl)
      }, 1500)
      
    } catch (error) {
      console.error("Save failed:", error)
      setError(error instanceof Error ? error.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return <div>Loading...</div>
  }

  if (!session) {
    return (
      <div className="container">
        <h1>Edit Release</h1>
        <p>You need to be logged in to edit releases.</p>
        <p><Link href="/login">Login here</Link></p>
      </div>
    )
  }

  if (error && !releaseTitle) {
    return (
      <div className="container">
        <h1>Edit Release</h1>
        <div className="error">{error}</div>
        <p><Link href="/profile">← Back to your releases</Link></p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Edit Release: {releaseTitle}</h1>

      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        <ReleaseForm
          releaseTitle={releaseTitle}
          releaseDescription={releaseDescription}
          releaseType={releaseType}
          releaseDate={releaseDate}
          tags={tags}
          tracks={tracks}
          artworkPreview={artworkPreview}
          currentArtworkUrl={currentArtworkUrl}
          disabled={saving}
          onTitleChange={setReleaseTitle}
          onDescriptionChange={setReleaseDescription}
          onTypeChange={setReleaseType}
          onDateChange={setReleaseDate}
          onTagsChange={setTags}
          onArtworkChange={handleArtworkChange}
          onRemoveCurrentArtwork={handleRemoveCurrentArtwork}
          onTrackTitleChange={updateTrackTitle}
          onTrackLyricsChange={updateTrackLyrics}
          onTrackDelete={removeNewTrack}
          onTrackMoveUp={moveTrackUp}
          onTrackMoveDown={moveTrackDown}
          onTrackToggleDelete={markTrackForDeletion}
          onFileUpload={handleFilesChange}
          availableTags={availableTags}
          isEdit={true}
        />

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            type="submit"
            disabled={saving}
            style={{
              color: saving ? '#999' : '#0066cc',
              fontSize: '14px',
              padding: '8px 16px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Courier New, monospace'
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          
          <button 
            type="button"
            onClick={() => router.push(createReleaseUrl(releaseId, releaseTitle, artistName))}
            style={{
              fontSize: '14px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace'
            }}
          >
            Cancel
          </button>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          border: '2px solid #ff4444',
          backgroundColor: '#fff5f5',
          width: 'fit-content'
        }}>
          <div style={{ fontSize: '12px', marginBottom: '8px', color: '#666' }}>
            <strong>Danger Zone:</strong>
          </div>
          
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                color: deleting ? '#999' : '#cc0000',
                fontSize: '12px',
                padding: '6px 12px',
                width: '200px',
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontFamily: 'Courier New, monospace'
              }}
            >
              Delete Entire Release
            </button>
          ) : (
            <div style={{ fontSize: '12px' }}>
              <div style={{ marginBottom: '8px', color: '#000' }}>
                <strong>⚠️ Are you sure?</strong><br />
                This will permanently delete this release and all its tracks. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    color: deleting ? '#999' : '#cc0000',
                    fontSize: '11px',
                    padding: '4px 8px',
                    width: '200px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: 'Courier New, monospace'
                  }}
                >
                  {deleting ? "Deleting..." : "Yes, Delete Forever"}
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deleting}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    width: '200px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: 'Courier New, monospace'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
