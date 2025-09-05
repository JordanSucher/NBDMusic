"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import ReleaseCard from "@/components/ReleaseCard"
import ArtistCard from "@/components/ArtistCard"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"

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
  _count: {
    listens: number
  }
}

interface Release {
  id: string
  title: string
  description: string | null
  releaseType: string
  releaseDate: string | null
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

interface Artist {
  id: string
  username: string
  name: string | null
  releaseCount: number
  followerCount: number
  totalTracks: number
  latestRelease: {
    id: string
    title: string
    releaseType: string
    artworkUrl: string | null
    uploadedAt: string
    releaseDate: string | null
  } | null
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

function BrowseContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queueAudio = useQueueAudioContext()
  const [releases, setReleases] = useState<Release[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [viewMode, setViewMode] = useState<'releases' | 'artists'>('releases')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFollowingOnly, setShowFollowingOnly] = useState(false)
  const [allTags, setAllTags] = useState<{name: string, count: number}[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [artistSortMode, setArtistSortMode] = useState<'latest' | 'alphabetical'>('latest')

  const fetchReleases = useCallback(async (page: number = currentPage) => {
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '10')
      
      if (showFollowingOnly && session) {
        params.set('following', 'true')
      }
      
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }
      
      if (selectedTags.length > 0) {
        // For now, just use the first selected tag since API expects single tag
        params.set('tag', selectedTags[0])
      }
      
      const url = `/api/releases?${params.toString()}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setReleases(data.releases || [])
        setPagination(data.pagination)
      } else {
        setError("Failed to load releases")
      }
    } catch (err) {
      setError("Something went wrong:" + err)
    } finally {
      setLoading(false)
    }
  }, [showFollowingOnly, session, currentPage, searchTerm, selectedTags])

  const fetchArtists = useCallback(async (page: number = currentPage) => {
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '10')
      
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }
      
      params.set('sort', artistSortMode)
      
      const url = `/api/artists?${params.toString()}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setArtists(data.artists || [])
        setPagination(data.pagination)
      } else {
        setError("Failed to load artists")
      }
    } catch (err) {
      setError("Something went wrong:" + err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, artistSortMode])

  const fetchData = useCallback(async (page: number = currentPage) => {
    if (viewMode === 'releases') {
      await fetchReleases(page)
    } else {
      await fetchArtists(page)
    }
  }, [viewMode, fetchReleases, fetchArtists, currentPage])

  const updateURL = useCallback((following: boolean, tags: string[] = selectedTags, search: string = searchTerm, page: number = currentPage, mode: 'releases' | 'artists' = viewMode) => {
    const params = new URLSearchParams()
    
    if (mode === 'artists') {
      params.set('view', 'artists')
    }
    
    if (following && mode === 'releases') {
      params.set('following', 'true')
    }
    
    if (tags.length > 0 && mode === 'releases') {
      // Keep existing tag logic if needed for releases
      tags.forEach(tag => {
        params.append('tag', tag)
      })
    }
    
    if (search) {
      params.set('search', search)
    }
    
    if (page > 1) {
      params.set('page', page.toString())
    }
    
    const newURL = params.toString() ? `/browse?${params.toString()}` : '/browse'
    router.replace(newURL)
  }, [selectedTags, searchTerm, currentPage, viewMode, router])

  const handleFollowingToggle = (checked: boolean) => {
    setShowFollowingOnly(checked)
    setCurrentPage(1) // Reset to first page when changing filters
    updateURL(checked, selectedTags, searchTerm, 1)
  }

  const handleViewModeChange = (mode: 'releases' | 'artists') => {
    setViewMode(mode)
    setCurrentPage(1)
    setLoading(true)
    updateURL(showFollowingOnly, selectedTags, searchTerm, 1, mode)
  }

  const handleArtistSortChange = (sortMode: 'latest' | 'alphabetical') => {
    setArtistSortMode(sortMode)
    setCurrentPage(1)
    setLoading(true)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      setCurrentPage(newPage)
      updateURL(showFollowingOnly, selectedTags, searchTerm, newPage)
      setLoading(true)
      fetchData(newPage)
    }
  }

  const handleSearchChange = (newSearch: string) => {
    setSearchTerm(newSearch)
    setCurrentPage(1)
    setLoading(true)
    updateURL(showFollowingOnly, selectedTags, newSearch, 1)
  }

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(tag => tag !== tagName)
      : [...selectedTags, tagName]
    
    setSelectedTags(newTags)
    setCurrentPage(1)
    setLoading(true)
    updateURL(showFollowingOnly, newTags, searchTerm, 1)
  }

  useEffect(() => {
    // Only read URL params on initial load, not on subsequent URL changes we make
    if (isInitialLoad) {
      // Check for view mode in URL
      const viewFromUrl = searchParams.get('view')
      if (viewFromUrl === 'artists') {
        setViewMode('artists')
      }

      // Check for tag filter in URL
      const tagFromUrl = searchParams.get('tag')
      if (tagFromUrl) {
        setSelectedTags([tagFromUrl])
      }

      // Check for following filter in URL
      const followingFromUrl = searchParams.get('following')
      if (followingFromUrl === 'true') {
        setShowFollowingOnly(true)
      }

      // Check for page parameter in URL
      const pageFromUrl = searchParams.get('page')
      if (pageFromUrl) {
        const pageNum = parseInt(pageFromUrl, 10)
        if (pageNum > 0) {
          setCurrentPage(pageNum)
        }
      }
      
      setIsInitialLoad(false)
    }
    
    fetchData()
    fetchTags()
  }, [searchParams, fetchData, isInitialLoad])

  // Refetch data when filters change (excluding initial load)
  useEffect(() => {
    if (!isInitialLoad && !loading) {
      fetchData()
    }
  }, [showFollowingOnly, searchTerm, selectedTags, viewMode, artistSortMode, fetchData, loading, isInitialLoad])

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
    handleTagToggle(tagName)
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedTags([])
    setTagInput("")
    setShowTagSuggestions(false)
    setShowFollowingOnly(false)
    setViewMode('releases')
    setCurrentPage(1)
    setLoading(true)
    router.replace('/browse') // Clear URL params
  }

  // Note: With pagination, we display all fetched releases
  // Search and tag filtering should be moved to API level for proper pagination
  const filteredReleases = releases

  return (
    <div className="container">
      <h1>Browse Music</h1>
      

      {/* Search and Filter */}
      <div className="mb-20">
        <h3>Search & Filter</h3>
        
        {/* View Mode Toggle */}
        <div className="mb-10">
          <label>Browse:</label><br />
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button
              onClick={() => handleViewModeChange('releases')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: viewMode === 'releases' ? '#0066cc' : '#333',
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontWeight: viewMode === 'releases' ? 'bold' : 'normal'
              }}
            >
              Releases
            </button>
            <button
              onClick={() => handleViewModeChange('artists')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: viewMode === 'artists' ? '#0066cc' : '#333',
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontWeight: viewMode === 'artists' ? 'bold' : 'normal'
              }}
            >
              Artists
            </button>
          </div>
        </div>
        
        {/* Artist Sort Toggle - Only show when in artists mode */}
        {viewMode === 'artists' && (
          <div className="mb-10">
            <label>Sort artists by:</label><br />
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button
                onClick={() => handleArtistSortChange('latest')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: artistSortMode === 'latest' ? '#0066cc' : '#333',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: artistSortMode === 'latest' ? 'bold' : 'normal'
                }}
              >
                Latest Release
              </button>
              <button
                onClick={() => handleArtistSortChange('alphabetical')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: artistSortMode === 'alphabetical' ? '#0066cc' : '#333',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: artistSortMode === 'alphabetical' ? 'bold' : 'normal'
                }}
              >
                Alphabetical
              </button>
            </div>
          </div>
        )}
        
        <div className="mb-10">
          <label htmlFor="search">{viewMode === 'releases' ? 'Search releases, tracks, or artists:' : 'Search artists:'}</label><br />
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchChange(searchTerm)
              }
            }}
            onBlur={() => handleSearchChange(searchTerm)}
            placeholder="Type to search... (press Enter or click away to search)"
          />
        </div>

        {/* Following Filter - Only for releases */}
        {session && viewMode === 'releases' && (
          <div className="mb-10">
            <label>
              <input
                type="checkbox"
                checked={showFollowingOnly}
                onChange={(e) => handleFollowingToggle(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show only releases from users I follow
            </label>
          </div>
        )}

        {/* Tag Filter - Only for releases */}
        {viewMode === 'releases' && (
          <div className="mb-10" style={{ position: 'relative' }}>
          <label htmlFor="tagFilter">Filter by tag:</label><br />
          <input
            type="text"
            id="tagFilter"
            value={tagInput}
            onChange={(e) => {
              const value = e.target.value
              setTagInput(value)
              setShowTagSuggestions(value.length > 0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = tagInput.trim()
                if (value) {
                  handleTagToggle(value)
                  setTagInput('')
                  setShowTagSuggestions(false)
                }
              } else if (e.key === 'Escape') {
                setShowTagSuggestions(false)
              }
            }}
            onFocus={() => {
              if (tagInput.length > 0) {
                setShowTagSuggestions(true)
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking on them
              setTimeout(() => setShowTagSuggestions(false), 150)
            }}
            placeholder="Type a tag name... (press Enter to filter)"
          />
          
          {/* Autocomplete suggestions */}
          {showTagSuggestions && tagInput.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderTop: 'none',
              maxHeight: '150px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {allTags
                .filter(tag => 
                  tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
                  !selectedTags.includes(tag.name)
                )
                .slice(0, 10)
                .map((tag) => (
                  <div
                    key={tag.name}
                    onClick={() => {
                      handleTagToggle(tag.name)
                      setTagInput('')
                      setShowTagSuggestions(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'Courier New, monospace',
                      borderBottom: '1px solid #eee'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white'
                    }}
                  >
                    {tag.name} <span style={{ color: '#666' }}>({tag.count})</span>
                  </div>
                ))
              }
              {allTags.filter(tag => 
                tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
                !selectedTags.includes(tag.name)
              ).length === 0 && (
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#666',
                  fontStyle: 'italic',
                  fontFamily: 'Courier New, monospace'
                }}>
                  No matching tags found
                </div>
              )}
            </div>
          )}
          
          {/* Show selected tags */}
          {selectedTags.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ 
                fontSize: '12px', 
                color: '#666', 
                fontFamily: 'Courier New, monospace',
                marginRight: '8px'
              }}>
                Active filter:
              </span>
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="tag"
                  style={{
                    display: 'inline-block',
                    margin: '0 4px 4px 0',
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    border: '1px solid #999',
                    fontFamily: 'Courier New, monospace',
                    fontWeight: 'normal',
                    borderRadius: '0',
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0h1v1H0V0zm2 2h1v1H2V2z' fill='%23ccc'/%3e%3c/svg%3e")`,
                    backgroundRepeat: 'repeat'
                  }}
                >
                  {tag}
                  <button
                    onClick={() => {
                      handleTagToggle(tag)
                      setTagInput('')
                    }}
                    style={{
                      marginLeft: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#666',
                      padding: '0',
                      lineHeight: '1'
                    }}
                    title="Remove tag filter"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          </div>
        )}

        {(searchTerm || (selectedTags.length > 0 && viewMode === 'releases') || (showFollowingOnly && viewMode === 'releases')) && (
          <p>
            Showing {filteredReleases.length} of {pagination?.totalCount || filteredReleases.length} releases
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedTags.length > 0 && ` with tags: ${selectedTags.join(', ')}`}
            {showFollowingOnly && ` from users you follow`}
            {" "}
            <button 
              onClick={clearAllFilters}
              style={{ 
                fontSize: '12px', 
                padding: '2px 4px',
                fontFamily: 'Courier New, monospace',
                cursor: 'pointer'
              }}
            >
              Clear all filters
            </button>
          </p>
        )}
      </div>

      {/* Release List */}
      {error && <div className="error">{error}</div>}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: '14px', color: '#666', fontFamily: 'Courier New, monospace' }}>
            Loading...
          </p>
        </div>
      ) : (viewMode === 'releases' ? filteredReleases.length === 0 : artists.length === 0) ? (
        <div>
          {viewMode === 'releases' ? (
            releases.length === 0 ? (
              <div>
                {showFollowingOnly ? (
                  <div>
                    <p>No releases from users you follow yet.</p>
                    <p><Link href="/browse" onClick={() => setShowFollowingOnly(false)}>Browse all releases</Link> to discover new artists to follow.</p>
                  </div>
                ) : (
                  <div>
                    <p>No music uploaded yet.</p>
                    {session ? (
                      <p><Link href="/upload">Be the first to upload a release!</Link></p>
                    ) : (
                      <p><Link href="/register">Create an account</Link> to start sharing your music.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p>No releases match your search criteria.</p>
            )
          ) : (
            artists.length === 0 ? (
              <div>
                <p>No artists found.</p>
                {searchTerm && <p>Try a different search term or browse all artists.</p>}
              </div>
            ) : (
              <p>No artists match your search criteria.</p>
            )
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3>
              {viewMode === 'releases' ? (
                pagination ? 
                  `Releases (${pagination.totalCount} total, showing ${filteredReleases.length} on page ${pagination.page})` :
                  `Releases (${filteredReleases.length})`
              ) : (
                pagination ? 
                  `Artists (${pagination.totalCount} total, showing ${artists.length} on page ${pagination.page})` :
                  `Artists (${artists.length})`
              )}
            </h3>
          </div>
          
          {/* Pagination Controls - Top */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '5px',
              marginBottom: '20px',
              padding: '15px 0'
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: pagination.hasPrevPage ? '#0066cc' : '#999',
                  cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                &lt;
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: pageNum === currentPage ? '#0066cc' : '#333',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    fontWeight: pageNum === currentPage ? 'bold' : 'normal'
                  }}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: pagination.hasNextPage ? '#0066cc' : '#999',
                  cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                &gt;
              </button>
            </div>
          )}

          {viewMode === 'releases' ? (
            filteredReleases.map(release => (
              <ReleaseCard key={release.id} release={release} />
            ))
          ) : (
            artists.map(artist => (
              <ArtistCard key={artist.id} artist={artist} />
            ))
          )}
          
          {/* Pagination Controls - Bottom */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '5px',
              marginTop: '30px',
              padding: '20px 0'
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: pagination.hasPrevPage ? '#0066cc' : '#999',
                  cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                &lt;
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: pageNum === currentPage ? '#0066cc' : '#333',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    fontWeight: pageNum === currentPage ? 'bold' : 'normal'
                  }}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: pagination.hasNextPage ? '#0066cc' : '#999',
                  cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                &gt;
              </button>
            </div>
          )}
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
