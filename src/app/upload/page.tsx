"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface TagWithCount {
  name: string
  count: number
}

export default function UploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [allTags, setAllTags] = useState<TagWithCount[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<TagWithCount[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

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

  // Redirect if not logged in
  if (status === "loading") {
    return (
      <div className="container">
        <h1>Upload Song</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container">
        <h1>Upload Song</h1>
        <p>You need to be logged in to upload songs.</p>
        <p><Link href="/login">Login here</Link></p>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file type - be more permissive and check extension too
      const allowedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
        'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac'
      ]
      
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
      const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'mp4']
      
      const isValidType = allowedTypes.includes(selectedFile.type) || 
                         (fileExtension && allowedExtensions.includes(fileExtension))
      
      if (!isValidType) {
        setError("Please upload an audio file (MP3, WAV, OGG, M4A, or AAC)")
        return
      }
      
      // Check file size (limit to 50MB)
      const maxSize = 50 * 1024 * 1024 // 50MB in bytes
      if (selectedFile.size > maxSize) {
        setError("File size must be less than 50MB")
        return
      }
      
      setFile(selectedFile)
      setError("")
      
      // Auto-populate title from filename
      const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "")
      const cleanTitle = nameWithoutExtension
        .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      
      setTitle(cleanTitle)
    }
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTags(value)
    
    // Get the current tag being typed (after the last comma)
    const currentTag = value.split(',').pop()?.trim().toLowerCase() || ''
    
    if (currentTag.length > 0) {
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(currentTag) &&
        !value.toLowerCase().includes(tag.name.toLowerCase())
      ).slice(0, 5) // Limit to 5 suggestions
      
      setTagSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const addSuggestedTag = (tagName: string) => {
    const lastTagIndex = tags.lastIndexOf(',')
    
    if (lastTagIndex === -1) {
      // No commas yet, replace entire input
      setTags(tagName)
    } else {
      // Replace the text after the last comma
      const beforeLastComma = tags.substring(0, lastTagIndex + 1)
      setTags(beforeLastComma + ' ' + tagName)
    }
    
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError("Please select a file to upload")
      return
    }
    
    if (!title.trim()) {
      setError("Please enter a song title")
      return
    }

    setUploading(true)
    setError("")
    setSuccess("")

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('tags', tags.trim())

      // Upload to our API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setSuccess("Song uploaded successfully!")
        setTitle("")
        setFile(null)
        setTags("")
        // Reset file input
        const fileInput = document.getElementById('file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        
        // Redirect to browse page after a moment
        setTimeout(() => {
          router.push('/browse')
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || "Upload failed")
      }
    } catch {
      setError("Something went wrong during upload")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container">
      <h1>Upload Song</h1>
      
      <nav>
        <Link href="/">← Back to home</Link>
        <Link href="/browse">Browse songs</Link>
      </nav>

      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        <div className="mb-10">
          <label htmlFor="file">Audio File:</label><br />
          <input
            type="file"
            id="file"
            accept="audio/*"
            onChange={handleFileChange}
            required
          />
          <small>Supported formats: MP3, WAV, OGG, M4A (max 50MB)</small>
        </div>

        <div className="mb-10">
          <label htmlFor="title">Song Title:</label><br />
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your song title"
            required
          />
          <small>Auto-filled from filename, but you can edit it</small>
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
          <small>Start typing to see suggestions from other songs</small>
          
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
                  <strong>{tag.name}</strong> ({tag.count} song{tag.count !== 1 ? 's' : ''})
                </div>
              ))}
            </div>
          )}
        </div>

        {file && (
          <div className="mb-10">
            <strong>Selected file:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}

        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Song"}
        </button>
      </form>

      <div className="mb-20">
        <h3>Tips:</h3>
        <ul>
          <li>Upload your file first - the title will be auto-filled from the filename</li>
          <li>Use descriptive titles for your songs</li>
          <li>Tag your music to help others discover it</li>
          <li>Popular tags: {allTags.slice(0, 5).map(tag => `${tag.name} (${tag.count})`).join(', ')}</li>
        </ul>
      </div>
    </div>
  )
}
