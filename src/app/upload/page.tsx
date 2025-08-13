"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface TagWithCount {
  name: string
  count: number
}

interface TrackUpload {
  file: File
  title: string
  trackNumber: number
}

interface UploadedFile {
  title: string
  trackNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

export default function UploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Release info
  const [releaseTitle, setReleaseTitle] = useState("")
  const [releaseDescription, setReleaseDescription] = useState("")
  const [releaseDate, setReleaseDate] = useState("")
  const [releaseType, setReleaseType] = useState("single")
  const [tags, setTags] = useState("")
  
  // Artwork
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  
  // Track info
  const [tracks, setTracks] = useState<TrackUpload[]>([])
  
  // UI state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
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
    fetchTagsWithCounts()
  }, [])

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

  // Direct upload function
  const uploadFileDirectly = async (file: File, fileType: 'track' | 'artwork'): Promise<string> => {
    try {
      // Get upload info
      const urlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileType,
          fileSize: file.size
        })
      })

      if (!urlResponse.ok) {
        const error = await urlResponse.json()
        throw new Error(error.error || 'Failed to get upload info')
      }

      const { pathname } = await urlResponse.json()

      // Use Vercel Blob's client-side upload
      const { upload } = await import('@vercel/blob/client')
      
      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload'
      })

      return blob.url
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  // Redirect if not logged in
  if (status === "loading") {
    return (
      <div className="container">
        <h1>Upload Music</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container">
        <h1>Upload Music</h1>
        <p>You need to be logged in to upload music.</p>
        <p><Link href="/login">Login here</Link></p>
      </div>
    )
  }

  const validateImageFile = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        resolve("Please upload a JPG, PNG, or GIF image")
        return
      }

      // Check file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        resolve("Image must be less than 10MB")
        return
      }

      // Check dimensions
      const img = new Image()
      img.onload = () => {
        if (img.width < 1000 || img.height < 1000) {
          resolve("Image must be at least 1000x1000 pixels")
        } else {
          resolve(null) // No error
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
      e.target.value = '' // Clear the input
      return
    }

    setArtworkFile(file)
    setArtworkPreview(URL.createObjectURL(file))
    setError("")
  }

  const removeArtwork = () => {
    setArtworkFile(null)
    setArtworkPreview(null)
    const artworkInput = document.getElementById('artwork') as HTMLInputElement
    if (artworkInput) artworkInput.value = ''
  }

  const validateAudioFile = (file: File): string | null => {
    // More permissive file type checking for mobile devices
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
      'audio/mp4a-latm', 'audio/x-caf', 'audio/quicktime',
      '', // Some mobile browsers report empty MIME type
    ]
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac']
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma']
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv']
    
    // Reject obvious video files by extension
    if (fileExtension && videoExtensions.includes(fileExtension)) {
      return "Video files are not supported. Please upload an audio file."
    }
    
    // Reject video MIME types
    const videoMimeTypes = ['video/avi', 'video/mkv', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (videoMimeTypes.includes(file.type)) {
      return "Video files are not supported. Please upload an audio file."
    }
    
    // Special case: video/mp4 is only allowed if extension suggests audio
    if (file.type === 'video/mp4' && fileExtension && !['m4a'].includes(fileExtension)) {
      return "Video files are not supported. Please upload an audio file."
    }
    
    // Accept if: valid audio MIME type OR valid audio extension OR starts with audio/
    const hasValidMimeType = allowedTypes.includes(file.type) || file.type.startsWith('audio/')
    const hasValidExtension = fileExtension && allowedExtensions.includes(fileExtension)
    const isEmptyTypeWithAudioExt = file.type === '' && fileExtension && audioExtensions.includes(fileExtension)
    
    const isValidType = hasValidMimeType || hasValidExtension || isEmptyTypeWithAudioExt
    
    if (!isValidType) {
      return `File type not supported. Detected: "${file.type}" with extension ".${fileExtension}". Please upload an audio file.`
    }
    
    // Check file size (limit to 50MB per track)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return "File size must be less than 50MB per track"
    }
    
    return null // No error
  }

  const cleanFileName = (fileName: string): string => {
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "")
    return nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    if (selectedFiles.length === 0) return
    
    // Validate all files first
    const validationErrors: string[] = []
    selectedFiles.forEach((file, index) => {
      const error = validateAudioFile(file)
      if (error) {
        validationErrors.push(`Track ${index + 1}: ${error}`)
      }
    })
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '))
      return
    }
    
    // Create track objects
    const newTracks: TrackUpload[] = selectedFiles.map((file, index) => ({
      file,
      title: cleanFileName(file.name),
      trackNumber: index + 1
    }))
    
    setTracks(newTracks)
    setError("")
    
    // Auto-set release title if not set
    if (!releaseTitle && newTracks.length > 0) {
      if (newTracks.length === 1) {
        setReleaseTitle(newTracks[0].title)
        setReleaseType("single")
      } else {
        // Try to extract common prefix for album/EP name
        const titles = newTracks.map(t => t.title)
        const commonPrefix = titles.reduce((acc, title) => {
          let i = 0
          while (i < acc.length && i < title.length && acc[i] === title[i]) {
            i++
          }
          return acc.substring(0, i)
        }).trim()
        
        if (commonPrefix.length > 3) {
          setReleaseTitle(commonPrefix)
        } else {
          setReleaseTitle("Untitled Release")
        }
        
        setReleaseType(newTracks.length <= 4 ? "ep" : "album")
      }
    }
  }

  const updateTrackTitle = (index: number, newTitle: string) => {
    setTracks(prev => prev.map((track, i) => 
      i === index ? { ...track, title: newTitle } : track
    ))
  }

  const removeTrack = (index: number) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (tracks.length === 0) {
      setError("Please select at least one audio file")
      return
    }
    
    if (!releaseTitle.trim()) {
      setError("Please enter a release title")
      return
    }

    setUploading(true)
    setError("")
    setSuccess("")
    setUploadProgress("Starting upload...")

    try {
      // Upload artwork if provided
      let artworkUrl = null
      if (artworkFile) {
        setUploadProgress("Uploading artwork...")
        artworkUrl = await uploadFileDirectly(artworkFile, 'artwork')
      }

      // Upload all track files
      setUploadProgress("Uploading tracks...")
      const uploadedTracks: UploadedFile[] = []

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i]
        setUploadProgress(`Uploading track ${i + 1} of ${tracks.length}: ${track.title}`)
        
        const fileUrl = await uploadFileDirectly(track.file, 'track')

        uploadedTracks.push({
          title: track.title.trim(),
          trackNumber: track.trackNumber,
          fileName: track.file.name,
          fileUrl,
          fileSize: track.file.size,
          mimeType: track.file.type
        })
      }

      // Submit release data to database
      setUploadProgress("Creating release...")
      const releaseData = {
        releaseTitle: releaseTitle.trim(),
        releaseDescription: releaseDescription.trim(),
        releaseType,
        tags: tags.trim(),
        releaseDate: releaseDate || undefined,
        artworkUrl,
        tracks: uploadedTracks
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(releaseData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create release')
      }

      const result = await response.json()
      
      setSuccess("Release uploaded successfully!")
      setUploadProgress("")
      
      // Clear form
      setReleaseTitle("")
      setReleaseDescription("")
      setReleaseDate("")
      setTracks([])
      setTags("")
      removeArtwork()
      const fileInput = document.getElementById('files') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      // Redirect to release page
      setTimeout(() => {
        router.push(`/release/${result.releaseId}`)
      }, 2000)

    } catch (error) {
      console.error('Upload failed:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      setUploadProgress("")
    } finally {
      setUploading(false)
    }
  }

  const getTotalSize = () => {
    const tracksSize = tracks.reduce((total, track) => total + track.file.size, 0)
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

  return (
    <div className="container">
      <h1>Upload Music</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        {uploadProgress && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            {uploadProgress}
          </div>
        )}
        
        {/* Artwork Upload */}
        <div className="space-y-2">
          <label htmlFor="artwork" className="block text-sm font-medium">Artwork (optional):</label>
          <input
            type="file"
            id="artwork"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            onChange={handleArtworkChange}
            disabled={uploading}
            className="w-full p-2 border-2 border-gray-300 text-sm font-mono bg-white file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-gray-200 file:text-black disabled:opacity-50"
          />
          <small className="text-xs text-gray-600 block">JPG, PNG, or GIF. Minimum 1000x1000 pixels, max 10MB. Square images work best.</small>
          
          {artworkPreview && (
            <div className="mt-2 p-2 border-2 border-black bg-white inline-block">
              <div className="mb-1 text-xs">
                <strong>Artwork preview:</strong>
                <button
                  type="button"
                  onClick={removeArtwork}
                  disabled={uploading}
                  className="ml-2 text-xs py-1 px-2 bg-red-500 text-white disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
              <img 
                src={artworkPreview} 
                alt="Artwork preview" 
                className="max-w-[120px] max-h-[120px] border border-gray-300"
              />
              <div className="text-xs mt-1 text-gray-600">
                {artworkFile?.name} ({formatFileSize(artworkFile?.size || 0)})
              </div>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label htmlFor="files" className="block text-sm font-medium">Audio Files:</label>
          <input
            type="file"
            id="files"
            accept=".mp3,.wav,.m4a,.aac,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg"
            multiple
            onChange={handleFilesChange}
            required
            disabled={uploading}
            className="w-full p-2 border-2 border-gray-300 text-sm font-mono bg-white file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-gray-200 file:text-black disabled:opacity-50"
          />
          <small className="text-xs text-gray-600 block">Select one or more audio files. Supported: MP3, WAV, M4A, AAC, OGG (max 50MB each)</small>
        </div>

        {/* Track List */}
        {tracks.length > 0 && (
          <div className="mb-20" style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}>
            <h3 className="font-bold">Tracks ({tracks.length})</h3>
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div key={index} className="track-row">
                  {/* Single line with all controls */}
                  <div className="track-reorder-buttons">
                      <button
                        type="button"
                        onClick={() => moveTrackUp(index)}
                        disabled={index === 0 || uploading}
                        className={`w-6 h-6 text-xs border flex items-center justify-center ${
                          index === 0 || uploading
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-300 text-black hover:bg-gray-400'
                        }`}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTrackDown(index)}
                        disabled={index === tracks.length - 1 || uploading}
                        className={`w-6 h-6 text-xs border flex items-center justify-center ${
                          index === tracks.length - 1 || uploading
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-300 text-black hover:bg-gray-400'
                        }`}
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
                          disabled={uploading}
                          className="track-title-input disabled:opacity-50"
                          placeholder="Track title"
                        />
                        <div className="track-info">
                          {track.title} ({formatFileSize(track.file?.size || 0)})
                        </div>
                  </div>

                  <div className="track-actions">
                      <button
                        type="button"
                        onClick={() => removeTrack(index)}
                        disabled={uploading}
                        className="px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600 shrink-0 ml-auto disabled:opacity-50"
                      >
                        Remove
                      </button>
                  </div>
                  
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-700">
              <strong>Total size:</strong> {formatFileSize(getTotalSize())}
              {artworkFile && <span> (includes artwork)</span>}
            </div>
          </div>
        )}

        {/* Release Info */}
        <div className="space-y-2">
          <label htmlFor="releaseTitle" className="block text-sm font-medium">Release Title:</label>
          <input
            type="text"
            id="releaseTitle"
            value={releaseTitle}
            onChange={(e) => setReleaseTitle(e.target.value)}
            placeholder="Enter release title"
            required
            disabled={uploading}
            className="w-full p-2 border-2 border-gray-300 font-mono text-base bg-white disabled:opacity-50"
          />
          <small className="text-xs text-gray-600 block">Auto-filled from tracks, but you can edit it</small>
        </div>

        <div className="space-y-2 mb-2!">
          <label htmlFor="releaseType" className="block text-sm font-medium">Release Type:</label>
          <select
            id="releaseType"
            value={releaseType}
            onChange={(e) => setReleaseType(e.target.value)}
            disabled={uploading}
            className="p-2 border-2 border-gray-300 font-mono text-sm bg-white w-48 disabled:opacity-50"
          >
            <option value="single">Single</option>
            <option value="ep">EP</option>
            <option value="album">Album</option>
            <option value="demo">Demo</option>
          </select>
        </div>

        {/* Release Date */}
        <div className="space-y-2 mb-2!">
          <label htmlFor="releaseDate" className="block text-sm font-medium">Release Date:</label>
          <input
            type="date"
            id="releaseDate"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            min={formatDateForInput(new Date())}
            disabled={uploading}
            className="p-2 border-2 border-gray-300 font-mono text-sm bg-white w-48 disabled:opacity-50"
          />
          <div className="text-xs text-gray-600 space-y-1 mt-1!">
            <div>Leave empty to publish immediately. Future dates will keep the release private until that date.</div>
            {releaseDate && new Date(releaseDate) > new Date() && (
              <div className="text-orange-600 font-bold">
                ⚠️ This release will be scheduled and not publicly visible until {new Date(releaseDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="releaseDescription" className="block text-sm font-medium">Description (optional):</label>
          <textarea
            id="releaseDescription"
            value={releaseDescription}
            onChange={(e) => setReleaseDescription(e.target.value)}
            placeholder="Describe your release..."
            rows={3}
            disabled={uploading}
            className="w-full p-2 border-2 border-gray-300 font-mono text-sm bg-white resize-y disabled:opacity-50"
          />
        </div>

        <div className="space-y-2 relative">
          <label htmlFor="tags" className="block text-sm font-medium">Tags (optional):</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={handleTagsChange}
            onFocus={() => tags.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="demo, rock, work-in-progress, acoustic (comma separated)"
            disabled={uploading}
            className="w-full p-2 border-2 border-gray-300 font-mono text-base bg-white disabled:opacity-50"
          />
          <small className="text-xs text-gray-600 block">Start typing to see suggestions from other releases</small>
          
          {showSuggestions && tagSuggestions.length > 0 && !uploading && (
            <div className="absolute top-full left-0 right-0 bg-white border-2 border-gray-300 border-t-0 max-h-36 overflow-y-auto z-50">
              {tagSuggestions.map(tag => (
                <div
                  key={tag.name}
                  onClick={() => addSuggestedTag(tag.name)}
                  className="p-2 cursor-pointer border-b border-gray-200 font-mono text-xs hover:bg-gray-100"
                >
                  <strong>{tag.name}</strong> ({tag.count} release{tag.count !== 1 ? 's' : ''})
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={uploading || tracks.length === 0}
          className="px-4 py-2 border border-black font-mono text-sm bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : `Upload ${releaseType}`}
        </button>
      </form>
    </div>
  )
}
