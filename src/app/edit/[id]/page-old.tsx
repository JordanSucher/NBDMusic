"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

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
  id?: string // Existing tracks have IDs, new ones don't
  file?: File // New tracks have files, existing ones don't
  title: string
  trackNumber: number
  lyrics: string
  fileName?: string // For existing tracks
  fileUrl?: string // For existing tracks
  fileSize?: number // For existing tracks
  mimeType?: string // For existing tracks
  isNew?: boolean // Flag to identify new tracks
  toDelete?: boolean // Flag to mark tracks for deletion
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
  const [allTags, setAllTags] = useState<TagWithCount[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<TagWithCount[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
      const fetchReleaseData = async () => {
        try {
          const response = await fetch(`/api/releases/${releaseId}`)
          if (response.ok) {
            const data = await response.json()
            const release = data.release
            
            // Populate form with existing data
            setReleaseTitle(release.title)
            setReleaseDescription(release.description || "")
            setReleaseType(release.releaseType)
            setCurrentArtworkUrl(release.artworkUrl)
            setReleaseDate(release.releaseDate ? formatDateForInput(new Date(release.releaseDate)) : "")
            
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
            
            // Set existing tags
            const existingTagNames = release.tags.map((rt: { tag: { name: string } }) => rt.tag.name)
            setTags(existingTagNames.join(', '))
            
          } else if (response.status === 404) {
            setError("Release not found")
          } else if (response.status === 403) {
            setError("You can only edit your own releases")
          } else {
            setError("Failed to load release")
          }
        } catch {
          setError("Something went wrong loading the release")
        } finally {
          setLoading(false)
        }
      }


    fetchTagsWithCounts()
    if (releaseId) {
      fetchReleaseData()
    }
  }, [releaseId])

  const fetchTagsWithCounts = async () => {
    try {
      const response = await fetch('/api/tags/counts')
      if (response.ok) {
        const data = await response.json()
        setAllTags(data.tags)
      }
    } catch (err) {
      console.error("Failed to load tags:", err)
    }
  }



  // Redirect if not logged in
  if (status === "loading" || loading) {
    return (
      <div className="container">
        <h1>Edit Release</h1>
        <p>Loading...</p>
      </div>
    )
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
        <p><Link href="/profile">← Back to profile</Link></p>
      </div>
    )
  }

  const validateImageFile = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        resolve("Please upload a JPG, PNG, or GIF image")
        return
      }

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        resolve("Image must be less than 10MB")
        return
      }

      const img = new Image()
      img.onload = () => {
        if (img.width < 1000 || img.height < 1000) {
          resolve("Image must be at least 1000x1000 pixels")
        } else {
          resolve(null)
        }
      }
      img.onerror = () => {
        resolve("Invalid image file")
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleArtworkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setArtworkFile(null)
      setArtworkPreview(null)
      return
    }

    const validationError = await validateImageFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }

    setArtworkFile(file)
    setArtworkPreview(URL.createObjectURL(file))
    setRemoveCurrentArtwork(false) // Don't remove current if uploading new
    setError("")
  }

  const removeNewArtwork = () => {
    setArtworkFile(null)
    setArtworkPreview(null)
    const artworkInput = document.getElementById('artwork') as HTMLInputElement
    if (artworkInput) artworkInput.value = ''
  }

  const validateAudioFile = (file: File): string | null => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
      'audio/mp4a-latm', 'audio/x-caf', 'audio/quicktime', ''
    ]
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac']
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma']
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv']
    
    if (fileExtension && videoExtensions.includes(fileExtension)) {
      return "Video files are not supported. Please upload an audio file."
    }
    
    const videoMimeTypes = ['video/avi', 'video/mkv', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (videoMimeTypes.includes(file.type)) {
      return "Video files are not supported. Please upload an audio file."
    }
    
    if (file.type === 'video/mp4' && fileExtension && !['m4a'].includes(fileExtension)) {
      return "Video files are not supported. Please upload an audio file."
    }
    
    const hasValidMimeType = allowedTypes.includes(file.type) || file.type.startsWith('audio/')
    const hasValidExtension = fileExtension && allowedExtensions.includes(fileExtension)
    const isEmptyTypeWithAudioExt = file.type === '' && fileExtension && audioExtensions.includes(fileExtension)
    
    const isValidType = hasValidMimeType || hasValidExtension || isEmptyTypeWithAudioExt
    
    if (!isValidType) {
      return `File type not supported. Detected: "${file.type}" with extension ".${fileExtension}". Please upload an audio file.`
    }
    
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return "File size must be less than 50MB per track"
    }
    
    return null
  }

  const cleanFileName = (fileName: string): string => {
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "")
    return nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleAddTracks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    if (selectedFiles.length === 0) return
    
    // Validate all files first
    const validationErrors: string[] = []
    selectedFiles.forEach((file, index) => {
      const error = validateAudioFile(file)
      if (error) {
        validationErrors.push(`New track ${index + 1}: ${error}`)
      }
    })
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '))
      return
    }
    
    // Find the highest track number
    const maxTrackNumber = tracks.length > 0 ? Math.max(...tracks.map(t => t.trackNumber)) : 0
    
    // Create new track objects
    const newTracks: TrackUpdate[] = selectedFiles.map((file, index) => ({
      file,
      title: cleanFileName(file.name),
      trackNumber: maxTrackNumber + index + 1,
      lyrics: "",
      isNew: true,
      toDelete: false
    }))
    
    setTracks(prev => [...prev, ...newTracks])
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
    setTracks(prev => prev.map((track, i) => 
      i === index ? { ...track, toDelete: !track.toDelete } : track
    ))
  }

  const removeNewTrack = (index: number) => {
    setTracks(prev => {
      const newTracks = prev.filter((_, i) => i !== index)
      // Renumber tracks
      return newTracks.map((track, i) => ({ ...track, trackNumber: i + 1 }))
    })
  }

  const moveTrackUp = (index: number) => {
    if (index === 0) return
    
    setTracks(prev => {
      const newTracks = [...prev]
      // Swap with previous track
      const temp = newTracks[index]
      newTracks[index] = newTracks[index - 1]
      newTracks[index - 1] = temp
      
      // Update track numbers
      return newTracks.map((track, i) => ({ ...track, trackNumber: i + 1 }))
    })
  }

  const moveTrackDown = (index: number) => {
    setTracks(prev => {
      if (index === prev.length - 1) return prev
      
      const newTracks = [...prev]
      // Swap with next track
      const temp = newTracks[index]
      newTracks[index] = newTracks[index + 1]
      newTracks[index + 1] = temp
      
      // Update track numbers
      return newTracks.map((track, i) => ({ ...track, trackNumber: i + 1 }))
    })
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTags(value)
    
    const currentTag = value.split(',').pop()?.trim().toLowerCase() || ''
    
    if (currentTag.length > 0) {
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(currentTag) &&
        !value.toLowerCase().includes(tag.name.toLowerCase())
      ).slice(0, 5)
      
      setTagSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const addSuggestedTag = (tagName: string) => {
    const lastTagIndex = tags.lastIndexOf(',')
    
    if (lastTagIndex === -1) {
      setTags(tagName)
    } else {
      const beforeLastComma = tags.substring(0, lastTagIndex + 1)
      setTags(beforeLastComma + ' ' + tagName)
    }
    
    setShowSuggestions(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const activeTracks = tracks.filter(track => !track.toDelete)
    if (activeTracks.length === 0) {
      setError("Release must have at least one track")
      return
    }
    
    if (!releaseTitle.trim()) {
      setError("Please enter a release title")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const formData = new FormData()
      formData.append('releaseTitle', releaseTitle.trim())
      formData.append('releaseDescription', releaseDescription.trim())
      formData.append('releaseType', releaseType)
      formData.append('tags', tags.trim())
      formData.append('removeCurrentArtwork', removeCurrentArtwork.toString())
      
      // Add new artwork if provided
      if (artworkFile) {
        formData.append('artwork', artworkFile)
      }
      
      // Add existing tracks (for title updates)
      const existingTracks = tracks.filter(track => !track.isNew)
      existingTracks.forEach((track, index) => {
        formData.append(`existing_${index}_id`, track.id!)
        formData.append(`existing_${index}_title`, track.title.trim())
        formData.append(`existing_${index}_lyrics`, track.lyrics.trim())
        formData.append(`existing_${index}_number`, track.trackNumber.toString())
        formData.append(`existing_${index}_delete`, track.toDelete ? 'true' : 'false')
      })
      formData.append('existingTrackCount', existingTracks.length.toString())
      
      // Add new tracks
      const newTracks = tracks.filter(track => track.isNew && !track.toDelete)
      newTracks.forEach((track, index) => {
        formData.append(`new_${index}_file`, track.file!)
        formData.append(`new_${index}_title`, track.title.trim())
        formData.append(`new_${index}_lyrics`, track.lyrics.trim())
        formData.append(`new_${index}_number`, track.trackNumber.toString())
      })
      formData.append('newTrackCount', newTracks.length.toString())

      // Add release date if provided
      formData.append('releaseDate', releaseDate || '')

      const response = await fetch(`/api/releases/${releaseId}`, {
        method: 'PUT',
        body: formData,
      })

      if (response.ok) {
        setSuccess("Release updated successfully!")
        setTimeout(() => {
          router.push('/profile')
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || "Update failed")
      }
    } catch {
      setError("Something went wrong during update")
    } finally {
      setSaving(false)
    }
  }

  const getTotalSize = () => {
    const tracksSize = tracks.reduce((total, track) => {
      if (track.toDelete) return total
      return total + (track.file?.size || track.fileSize || 0)
    }, 0)
    const artworkSize = artworkFile?.size || 0
    return tracksSize + artworkSize
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Edit Release</h1>
        <p>Loading release data...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Edit Release</h1>
  
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        {/* Release title */}
         <div className="mb-10">
          <label htmlFor="releaseTitle">Release Title:</label><br />
          <input
            type="text"
            id="releaseTitle"
            value={releaseTitle}
            onChange={(e) => setReleaseTitle(e.target.value)}
            placeholder="Enter release title"
            required
          />
        </div>

        {/* Artwork Management */}
        <div className="mb-10">
          <label>Artwork:</label><br />
          
          {/* Show current artwork only if no new artwork is being uploaded */}
          {currentArtworkUrl && !removeCurrentArtwork && !artworkPreview ? (
            <div style={{ 
              marginTop: '5px', 
              marginBottom: '10px',
              border: '2px solid #000', 
              padding: '10px', 
              backgroundColor: '#fff',
              display: 'inline-block'
            }}>
              <div style={{ marginBottom: '5px', fontSize: '12px' }}>
                <strong>Current artwork:</strong>
              </div>
              <img 
                src={currentArtworkUrl} 
                alt="Current artwork" 
                style={{ 
                  maxWidth: '120px', 
                  maxHeight: '120px',
                  border: '1px solid #ccc',
                  display: 'block',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRemoveCurrentArtwork(true)}
                  style={{ 
                    fontSize: '11px', 
                    padding: '2px 4px',
                    backgroundColor: '#ff6666',
                    color: 'white'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: '10px' }}>
              {removeCurrentArtwork ? (
                <span>
                  ⚠️ Current artwork will be removed when saved. 
                  <button
                    type="button"
                    onClick={() => setRemoveCurrentArtwork(false)}
                    style={{ marginLeft: '5px', fontSize: '11px' }}
                  >
                    Keep Current
                  </button>
                </span>
              ) : artworkPreview ? (
                "Replacing current artwork with:"
              ) : (
                "No current artwork"
              )}
            </div>
          )}

          {/* New artwork upload */}
          <div>
            <label htmlFor="artwork">
              {currentArtworkUrl && !removeCurrentArtwork ? 'Replace artwork:' : 'Upload artwork:'}
            </label><br />
            <input
              type="file"
              id="artwork"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              onChange={handleArtworkChange}
            />
            <small>JPG, PNG, or GIF. Minimum 1000x1000 pixels, max 10MB. Square images work best.</small>
            
            {/* New artwork preview - this replaces the current artwork display */}
            {artworkPreview && (
              <div style={{ 
                marginTop: '10px', 
                border: '2px solid #000', 
                padding: '10px', 
                backgroundColor: '#fff',
                display: 'inline-block'
              }}>
                <div style={{ marginBottom: '5px', fontSize: '12px' }}>
                  <strong>New artwork preview:</strong>
                  <button
                    type="button"
                    onClick={removeNewArtwork}
                    style={{ 
                      marginLeft: '10px',
                      fontSize: '11px', 
                      padding: '2px 4px',
                      backgroundColor: '#ff6666',
                      color: 'white'
                    }}
                  >
                    Remove
                  </button>
                </div>
                <img 
                  src={artworkPreview} 
                  alt="New artwork preview" 
                  style={{ 
                    maxWidth: '120px', 
                    maxHeight: '120px',
                    border: '1px solid #ccc'
                  }}
                />
                <div style={{ fontSize: '11px', marginTop: '5px', color: '#666' }}>
                  {artworkFile?.name} ({formatFileSize(artworkFile?.size || 0)})
                </div>
                {currentArtworkUrl && (
                  <div style={{ fontSize: '11px', marginTop: '3px', color: '#888' }}>
                    Will replace current artwork
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add New Tracks */}
        <div className="mb-10">
          <label htmlFor="newTracks">Add Tracks:</label><br />
          <input
            type="file"
            id="newTracks"
            accept=".mp3,.wav,.m4a,.aac,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg"
            multiple
            onChange={handleAddTracks}
          />
          <small>Add additional tracks to this release</small>
        </div>

        {/* Track List */}
        {tracks.length > 0 && (
          <div className="mb-20" style={{ border: '2px solid #000', padding: '10px', backgroundColor: '#fff' }}>
            <h3>Tracks ({tracks.filter(t => !t.toDelete).length})</h3>
            {tracks.map((track, index) => (
              <div key={track.id || index} className={`track-row ${track.toDelete ? 'marked-for-deletion' : ''}`}>
                <div className="track-reorder-buttons">
                  <button
                    type="button"
                    className="track-move-btn move-up"
                    onClick={() => moveTrackUp(index)}
                    disabled={index === 0 || track.toDelete}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="track-move-btn move-down"
                    onClick={() => moveTrackDown(index)}
                    disabled={index === tracks.length - 1 || track.toDelete}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                
                <div className="track-number">Track {track.trackNumber}:</div>
                
                <div className="track-details">
                  <input
                    type="text"
                    value={track.title}
                    onChange={(e) => updateTrackTitle(index, e.target.value)}
                    className="track-title-input"
                    placeholder="Track title"
                    disabled={track.toDelete}
                  />
                  <textarea
                    value={track.lyrics}
                    onChange={(e) => updateTrackLyrics(index, e.target.value)}
                    placeholder="Track lyrics (optional)"
                    disabled={track.toDelete}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      resize: 'vertical',
                      marginTop: '5px',
                      fontSize: '12px',
                      fontFamily: 'Courier New, monospace'
                    }}
                    className={track.toDelete ? 'disabled:opacity-50' : ''}
                  />
                  <div className="track-info">
                    {track.fileName || track.file?.name} ({formatFileSize(track.file?.size || track.fileSize || 0)})
                    {track.isNew && <span className="track-status new"> • NEW</span>}
                    {track.toDelete && <span className="track-status delete"> • WILL BE DELETED</span>}
                  </div>
                </div>
                
                <div className="track-actions">
                  {track.isNew ? (
                    <button
                      type="button"
                      onClick={() => removeNewTrack(index)}
                      style={{ 
                        fontSize: '11px', 
                        padding: '2px 4px',
                        backgroundColor: '#ff6666',
                        color: 'white'
                      }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markTrackForDeletion(index)}
                      style={{ 
                        fontSize: '11px', 
                        padding: '2px 4px',
                        backgroundColor: track.toDelete ? '#66ff66' : '#ff6666',
                        color: 'white'
                      }}
                    >
                      {track.toDelete ? 'Restore' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div style={{ fontSize: '12px', marginTop: '10px' }}>
              <strong>Total size:</strong> {formatFileSize(getTotalSize())}
              {artworkFile && <span> (includes new artwork)</span>}
            </div>
          </div>
        )}

        {/* Release Info */}
        <div className="mb-10">
          <label htmlFor="releaseType">Release Type:</label><br />
          <select
            id="releaseType"
            value={releaseType}
            onChange={(e) => setReleaseType(e.target.value)}
            style={{
              padding: '4px',
              border: '2px inset #ccc',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              marginBottom: '10px',
              background: 'white',
              width: '200px'
            }}
          >
            <option value="single">Single</option>
            <option value="ep">EP</option>
            <option value="album">Album</option>
            <option value="demo">Demo</option>
          </select>
        </div>

        {/* Release Date */}
        <div className="mb-10">
          <label htmlFor="releaseDate">Release Date:</label><br />
          <input
            type="date"
            id="releaseDate"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            style={{
              padding: '4px',
              border: '2px inset #ccc',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              marginBottom: '10px',
              background: 'white',
              width: '200px'
            }}
          />
          <small>
            Leave empty for immediate release. Future dates keep the release private until that date.
            {releaseDate && new Date(releaseDate) > new Date() && (
              <span style={{ color: '#ff6600', fontWeight: 'bold' }}>
                <br />⚠️ This release is scheduled and not publicly visible until {new Date(releaseDate).toLocaleDateString('UTC', {timeZone: 'UTC'})}
              </span>
            )}
            {releaseDate && new Date(releaseDate) <= new Date() && (
              <span style={{ color: '#008800' }}>
                <br />✓ This release is publicly visible
              </span>
            )}
          </small>
        </div>

        <div className="mb-10">
          <label htmlFor="releaseDescription">Description (optional):</label><br />
          <textarea
            id="releaseDescription"
            value={releaseDescription}
            onChange={(e) => setReleaseDescription(e.target.value)}
            placeholder="Describe your release..."
            rows={3}
            style={{
              width: '100%',
              padding: '4px',
              border: '2px inset #ccc',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              marginBottom: '10px',
              background: 'white',
              resize: 'vertical'
            }}
          />
        </div>

        <div className="mb-10" style={{ position: 'relative' }}>
          <label htmlFor="tags">Tags (optional):</label><br />
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={handleTagsChange}
            onFocus={() => tags.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="demo, rock, work-in-progress, acoustic (comma separated)"
          />
          <small>Start typing to see suggestions from other releases</small>
          
          {showSuggestions && tagSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '2px solid #ccc',
              borderTop: 'none',
              maxHeight: '150px',
              overflowY: 'auto',
              zIndex: 1000
            }}>
              {tagSuggestions.map(tag => (
                <div
                  key={tag.name}
                  onClick={() => addSuggestedTag(tag.name)}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '12px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <strong>{tag.name}</strong> ({tag.count} release{tag.count !== 1 ? 's' : ''})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '15px', 
          alignItems: 'left',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '2px solid #ccc'
        }}>
          <button 
            type="submit" 
            disabled={saving || tracks.filter(t => !t.toDelete).length === 0}
            style={{width: '200px'}}
            >
            {saving ? "Saving..." : "Update Release"}
          </button>

          <div style={{ 
            border: '2px solid #ff4444', 
            padding: '10px', 
            backgroundColor: '#ffe6e6',
            fontFamily: 'Courier New, monospace',
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
                  backgroundColor: '#ff4444',
                  color: 'white',
                  fontSize: '12px',
                  padding: '6px 12px',
                  width: '200px',
                  border: '1px solid #000',
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
                      backgroundColor: '#ff0000',
                      color: 'white',
                      fontSize: '11px',
                      padding: '4px 8px',
                      width: '200px',
                      border: '1px solid #000',
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
                      backgroundColor: '#ddd',
                      color: '#000',
                      fontSize: '11px',
                      padding: '4px 8px',
                      width: '200px',
                      border: '1px solid #000',
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
        </div>
      </form>

    </div>
  )
}
