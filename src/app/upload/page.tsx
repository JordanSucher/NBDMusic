"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ReleaseForm from "@/components/ReleaseForm"

interface TagWithCount {
  name: string
  count: number
}

interface TrackUpload {
  file: File
  title: string
  trackNumber: number
  lyrics: string
  isNew?: boolean
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
  
  // Tag suggestions
  const [availableTags, setAvailableTags] = useState<TagWithCount[]>([])

  // Authentication check
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
    }
  }, [session, status, router])

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
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      .trim()
  }

  const validateAudioFile = (file: File): string | null => {
    const validTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 
      'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'
    ]
    
    const validExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return `Invalid file type: ${file.name}. Supported formats: MP3, WAV, M4A, AAC, OGG`
    }
    
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return `File too large: ${file.name}. Maximum size is 50MB.`
    }
    
    return null
  }

  const uploadFileDirectly = async (file: File, fileType: 'track' | 'artwork'): Promise<string> => {
    try {
      const response = await fetch('/api/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileType
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to get upload URL')
      }

      const { uploadUrl, fileUrl } = await response.json()

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      return fileUrl
    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error)
      throw error
    }
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

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validationErrors: string[] = []
    const validFiles: File[] = []

    files.forEach(file => {
      const error = validateAudioFile(file)
      if (error) {
        validationErrors.push(error)
      } else {
        validFiles.push(file)
      }
    })

    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '))
      return
    }
    
    const maxTrackNumber = tracks.length > 0 ? Math.max(...tracks.map(t => t.trackNumber)) : 0
    
    const newTracks: TrackUpload[] = validFiles.map((file, index) => ({
      file,
      title: cleanFileName(file.name),
      trackNumber: maxTrackNumber + index + 1,
      lyrics: "",
      isNew: true
    }))
    
    setTracks(prev => [...prev, ...newTracks])
    setError("")
    
    if (!releaseTitle && newTracks.length > 0) {
      if (newTracks.length === 1) {
        setReleaseTitle(newTracks[0].title)
        setReleaseType("single")
      } else {
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
          setReleaseType(newTracks.length > 6 ? "album" : "ep")
        }
      }
    }
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

  const removeTrack = (index: number) => {
    setTracks(prev => {
      const newTracks = prev.filter((_, i) => i !== index)
      return newTracks.map((track, i) => ({ ...track, trackNumber: i + 1 }))
    })
  }

  const moveTrackUp = (index: number) => {
    if (index === 0) return
    
    setTracks(prev => {
      const newTracks = [...prev]
      const temp = newTracks[index]
      newTracks[index] = newTracks[index - 1]
      newTracks[index - 1] = temp
      
      return newTracks.map((track, i) => ({ ...track, trackNumber: i + 1 }))
    })
  }

  const moveTrackDown = (index: number) => {
    setTracks(prev => {
      if (index === prev.length - 1) return prev
      
      const newTracks = [...prev]
      const temp = newTracks[index]
      newTracks[index] = newTracks[index + 1]
      newTracks[index + 1] = temp
      
      return newTracks.map((track, i) => ({ ...track, trackNumber: i + 1 }))
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return

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
      const uploadedTracks = []

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
          mimeType: track.file.type,
          lyrics: track.lyrics.trim()
        })
      }

      // Create release
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(releaseData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setSuccess(`Successfully uploaded "${releaseTitle}"!`)
      
      // Clear form
      setReleaseTitle("")
      setReleaseDescription("")
      setReleaseDate("")
      setTracks([])
      setTags("")
      setArtworkFile(null)
      setArtworkPreview(null)
      const fileInput = document.getElementById('files') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      const artworkInput = document.getElementById('artwork') as HTMLInputElement
      if (artworkInput) artworkInput.value = ''
      
      // Redirect to the new release
      setTimeout(() => {
        router.push(`/release/${result.releaseId}`)
      }, 2000)
      
    } catch (error) {
      console.error("Upload failed:", error)
      setError(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
      setUploadProgress("")
    }
  }

  if (status === "loading") {
    return <div>Loading...</div>
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

  return (
    <div className="container">
      <h1>Upload Music</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        {uploadProgress && (
          <div className="upload-progress">
            {uploadProgress}
          </div>
        )}
        
        <ReleaseForm
          releaseTitle={releaseTitle}
          releaseDescription={releaseDescription}
          releaseType={releaseType}
          releaseDate={releaseDate}
          tags={tags}
          tracks={tracks}
          artworkPreview={artworkPreview}
          disabled={uploading}
          onTitleChange={setReleaseTitle}
          onDescriptionChange={setReleaseDescription}
          onTypeChange={setReleaseType}
          onDateChange={setReleaseDate}
          onTagsChange={setTags}
          onArtworkChange={handleArtworkChange}
          onTrackTitleChange={updateTrackTitle}
          onTrackLyricsChange={updateTrackLyrics}
          onTrackDelete={removeTrack}
          onTrackMoveUp={moveTrackUp}
          onTrackMoveDown={moveTrackDown}
          onFileUpload={handleFilesChange}
          availableTags={availableTags}
          isEdit={false}
        />

        <button 
          type="submit"
          disabled={uploading || tracks.length === 0}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 border border-black cursor-pointer font-mono disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : `Upload ${releaseType}`}
        </button>
      </form>
    </div>
  )
}