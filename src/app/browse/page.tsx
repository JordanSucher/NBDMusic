"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import ReleaseCard from "@/components/ReleaseCard"

interface Track {
  id: string
  title: string
  trackNumber: number
  fileName: string
  fileUrl: string
  fileSize: number
  duration: number | null
  mimeType: string
}

interface Release {
  id: string
  title: string
  description: string | null
  releaseType: string
  artworkUrl: string | null
  uploadedAt: string
  user: {
    username: string
  }
  tags: {
    tag: {
      name: string
    }
  }[]
  tracks: Track[]
}

function BrowseContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<{name: string, count: number}[]>([])

  useEffect(() => {
    fetchReleases()
    fetchTags()
    
    // Check for tag filter in URL
    const tagFromUrl = searchParams.get('tag')
    if (tagFromUrl) {
      setSelectedTags([tagFromUrl])
    }
  }, [searchParams])

  const fetchReleases = async () => {
    try {
      const response = await fetch('/api/releases')
      if (response.ok) {
        const data = await response.json()
        setReleases(data.releases)
      } else {
        setError("Failed to load releases")
      }
    } catch (err) {
      setError("Something went wrong:" + err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
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

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(tag => tag !== tagName)
      } else {
        return [...prev, tagName]
      }
    })
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedTags([])
  }

  const filteredReleases = releases.filter(release => {
    const matchesSearch = release.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         release.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         release.tracks.some(track => track.title.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(selectedTag => 
                         release.tags.some(releaseTag => releaseTag.tag.name === selectedTag)
                       )
    
    return matchesSearch && matchesTags
  })

  if (loading) {
    return (
      <div className="container">
        <h1>Browse Music</h1>
        <p>Loading releases...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Browse Music</h1>
      
      <nav>
        <Link href="/">← Back to home</Link>
        {session && <Link href="/upload">Upload music</Link>}
      </nav>

      {/* Search and Filter */}
      <div className="mb-20">
        <h3>Search & Filter</h3>
        
        <div className="mb-10">
          <label htmlFor="search">Search releases, tracks, or artists:</label><br />
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
          />
        </div>

        <div className="mb-10">
          <label>Filter by tags (click to toggle):</label><br />
          <div style={{ marginTop: '5px' }}>
            {allTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => toggleTag(tag.name)}
                style={{
                  margin: '2px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: selectedTags.includes(tag.name) ? '#ffff00' : '#f0f0f0',
                  border: selectedTags.includes(tag.name) ? '2px solid #000' : '1px solid #ccc',
                  fontFamily: 'Courier New, monospace',
                  cursor: 'pointer',
                  fontWeight: selectedTags.includes(tag.name) ? 'bold' : 'normal'
                }}
              >
                {tag.name} ({tag.count})
              </button>
            ))}
          </div>
          <small>Selected tags: {selectedTags.length > 0 ? selectedTags.join(', ') : 'None'}</small>
        </div>

        {(searchTerm || selectedTags.length > 0) && (
          <p>
            Showing {filteredReleases.length} of {releases.length} releases
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedTags.length > 0 && ` with tags: ${selectedTags.join(', ')}`}
            {" "}
            <button 
              onClick={clearAllFilters}
              style={{ fontSize: '12px', padding: '2px 4px' }}
            >
              Clear all filters
            </button>
          </p>
        )}
      </div>

      {/* Release List */}
      {error && <div className="error">{error}</div>}
      
      {filteredReleases.length === 0 ? (
        <div>
          {releases.length === 0 ? (
            <div>
              <p>No music uploaded yet.</p>
              {session ? (
                <p><Link href="/upload">Be the first to upload a release!</Link></p>
              ) : (
                <p><Link href="/register">Create an account</Link> to start sharing your music.</p>
              )}
            </div>
          ) : (
            <p>No releases match your search criteria.</p>
          )}
        </div>
      ) : (
        <div>
          <h3>Releases ({filteredReleases.length})</h3>
          {filteredReleases.map(release => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="container">
        <h1>Browse Music</h1>
        <p>Loading...</p>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  )
}
