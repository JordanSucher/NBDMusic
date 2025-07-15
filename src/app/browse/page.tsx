"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
// import AudioPlayer from "@/components/AudioPlayer"
import SongCard from "@/components/SongCard"

interface Song {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileSize: number
  uploadedAt: string
  user: {
    username: string
  }
  tags: {
    tag: {
      name: string
    }
  }[]
}

function BrowseContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState("")
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    fetchSongs()
    fetchTags()
    
    // Check for tag filter in URL
    const tagFromUrl = searchParams.get('tag')
    if (tagFromUrl) {
      setSelectedTag(tagFromUrl)
    }
  }, [searchParams])

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/songs')
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
      } else {
        setError("Failed to load songs")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(data.tags)
      }
    } catch (err) {
      console.error("Failed to load tags:", err)
    }
  }

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         song.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTag = !selectedTag || 
                      song.tags.some(songTag => songTag.tag.name === selectedTag)
    
    return matchesSearch && matchesTag
  })

  if (loading) {
    return (
      <div className="container">
        <h1>Browse Songs</h1>
        <p>Loading songs...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Browse Songs</h1>
      
      <nav>
        <Link href="/">← Back to home</Link>
        {session && <Link href="/upload">Upload song</Link>}
      </nav>

      {/* Search and Filter */}
      <div className="mb-20">
        <h3>Search & Filter</h3>
        
        <div className="mb-10">
          <label htmlFor="search">Search songs or artists:</label><br />
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
          />
        </div>

        <div className="mb-10">
          <label htmlFor="tag-filter">Filter by tag:</label><br />
          <select 
            id="tag-filter"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            style={{
              padding: '4px',
              border: '2px inset #ccc',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              marginBottom: '10px',
              background: 'white'
            }}
          >
            <option value="">All tags</option>
            {allTags.map((tag: string) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {(searchTerm || selectedTag) && (
          <p>
            Showing {filteredSongs.length} of {songs.length} songs
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedTag && ` tagged "${selectedTag}"`}
            {" "}
            <button 
              onClick={() => { setSearchTerm(""); setSelectedTag("") }}
              style={{ fontSize: '12px', padding: '2px 4px' }}
            >
              Clear filters
            </button>
          </p>
        )}
      </div>

      {/* Song List */}
      {error && <div className="error">{error}</div>}
      
      {filteredSongs.length === 0 ? (
        <div>
          {songs.length === 0 ? (
            <div>
              <p>No songs uploaded yet.</p>
              {session ? (
                <p><Link href="/upload">Be the first to upload a song!</Link></p>
              ) : (
                <p><Link href="/register">Create an account</Link> to start sharing your music.</p>
              )}
            </div>
          ) : (
            <p>No songs match your search criteria.</p>
          )}
        </div>
      ) : (
        <div>
          <h3>Songs ({filteredSongs.length})</h3>
          {filteredSongs.map(song => (
            <SongCard key={song.id} song={song} />
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
        <h1>Browse Songs</h1>
        <p>Loading...</p>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  )
}
