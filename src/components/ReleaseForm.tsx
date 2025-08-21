import React, { useState } from 'react'
import TrackForm from './TrackForm'

interface Track {
  file?: File
  title: string
  trackNumber: number
  lyrics: string
  id?: string
  fileName?: string
  fileSize?: number
  isNew?: boolean
  toDelete?: boolean
}

interface ReleaseFormProps {
  releaseTitle: string
  releaseDescription: string
  releaseType: string
  releaseDate: string
  tags: string
  tracks: Track[]
  artworkPreview: string | null
  currentArtworkUrl?: string | null
  disabled?: boolean
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onTypeChange: (type: string) => void
  onDateChange: (date: string) => void
  onTagsChange: (tags: string) => void
  onArtworkChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveCurrentArtwork?: () => void
  onTrackTitleChange: (index: number, title: string) => void
  onTrackLyricsChange: (index: number, lyrics: string) => void
  onTrackDelete?: (index: number) => void
  onTrackMoveUp?: (index: number) => void
  onTrackMoveDown?: (index: number) => void
  onTrackToggleDelete?: (index: number) => void
  onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void
  availableTags?: { name: string; count?: number }[]
  isEdit?: boolean
}

export default function ReleaseForm({
  releaseTitle,
  releaseDescription,
  releaseType,
  releaseDate,
  tags,
  tracks,
  artworkPreview,
  currentArtworkUrl,
  disabled = false,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onDateChange,
  onTagsChange,
  onArtworkChange,
  onRemoveCurrentArtwork,
  onTrackTitleChange,
  onTrackLyricsChange,
  onTrackDelete,
  onTrackMoveUp,
  onTrackMoveDown,
  onTrackToggleDelete,
  onFileUpload,
  availableTags = [],
  isEdit = false
}: ReleaseFormProps) {
  const [tagSuggestions, setTagSuggestions] = useState<{ name: string; count?: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onTagsChange(value)
    
    const currentTag = value.split(',').pop()?.trim().toLowerCase() || ''
    
    if (currentTag.length > 0 && availableTags) {
      const filtered = availableTags.filter(tag => 
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
      onTagsChange(tagName)
    } else {
      const beforeLastComma = tags.substring(0, lastTagIndex + 1)
      onTagsChange(beforeLastComma + ' ' + tagName)
    }
    
    setShowSuggestions(false)
  }

  const removeArtwork = () => {
    const artworkInput = document.getElementById('artwork') as HTMLInputElement
    if (artworkInput) artworkInput.value = ''
    // Trigger change event to clear the preview in parent
    const event = new Event('change', { bubbles: true })
    artworkInput?.dispatchEvent(event)
  }

  return (
    <>

      {/* Artwork */}
      <div className="mb-20">
        <h2>Artwork</h2>
        
        {isEdit && currentArtworkUrl && !artworkPreview && (
          <div style={{ marginBottom: '10px' }}>
            <div>Current artwork:</div>
            <img 
              src={currentArtworkUrl} 
              alt="Current artwork"
              style={{ 
                width: '150px', 
                height: '150px', 
                objectFit: 'cover',
                border: '2px solid #000',
                marginTop: '5px'
              }}
            />
            {onRemoveCurrentArtwork && (
              <div style={{ marginTop: '5px' }}>
                <button
                  type="button"
                  onClick={onRemoveCurrentArtwork}
                  disabled={disabled}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: '1px solid #000',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  Remove Current Artwork
                </button>
              </div>
            )}
          </div>
        )}
        
        <label htmlFor="artwork">Upload Artwork (optional):</label>
        <div style={{ position: 'relative' }}>
          <input
            type="file"
            id="artwork"
            accept="image/*"
            onChange={onArtworkChange}
            disabled={disabled}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: disabled ? 'not-allowed' : 'pointer'
            }}
          />
          <button
            type="button"
            disabled={disabled}
            style={{
              padding: '8px 16px',
              border: '2px outset #ddd',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              backgroundColor: '#f5f5f5',
              color: '#000',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              width: '200px',
              textAlign: 'left'
            }}
          >
            Choose File...
          </button>
        </div>
        <small>Recommended: Square image, at least 300x300px</small>
        
        {artworkPreview && (
          <div style={{ marginTop: '10px' }}>
            <div>Preview:</div>
            <img 
              src={artworkPreview} 
              alt="Artwork preview"
              style={{ 
                width: '150px', 
                height: '150px', 
                objectFit: 'cover',
                border: '2px solid #000',
                marginTop: '5px'
              }}
            />
            <div style={{ marginTop: '5px' }}>
              <button
                type="button"
                onClick={removeArtwork}
                disabled={disabled}
                style={{
                  width: '200px',
                  fontSize: '12px',
                  padding: '4px 8px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: '1px solid #000',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>



      {/* File Upload */}
      {onFileUpload && (
        <div className="mb-20">
          <h2>{isEdit ? 'Add More Tracks' : 'Audio Files'}</h2>
          <label htmlFor="files">Select audio files:</label>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              id="files"
              multiple
              accept="audio/*"
              onChange={onFileUpload}
              disabled={disabled}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            />
            <button
              type="button"
              disabled={disabled}
              style={{
                padding: '8px 16px',
                border: '2px outset #ddd',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                backgroundColor: '#f5f5f5',
                color: '#000',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                width: '200px',
                textAlign: 'left'
              }}
            >
              Choose Files...
            </button>
          </div>
          <small>Select one or more audio files to upload. Supported formats: MP3, WAV, FLAC, AAC</small>
        </div>
      )}

      {/* Tracks Section */}
      {tracks.length > 0 && (
        <div className="mb-20">
          <h2>Tracks ({tracks.length})</h2>
          {tracks.map((track, index) => (
            <TrackForm
              key={track.id || index}
              track={track}
              index={index}
              disabled={disabled}
              onTitleChange={onTrackTitleChange}
              onLyricsChange={onTrackLyricsChange}
              onDelete={onTrackDelete}
              onMoveUp={onTrackMoveUp}
              onMoveDown={onTrackMoveDown}
              onToggleDelete={onTrackToggleDelete}
              canMoveUp={index > 0}
              canMoveDown={index < tracks.length - 1}
              showReorder={tracks.length > 1}
              formatFileSize={formatFileSize}
              hideNewStatus={!isEdit}
            />
          ))}
        </div>
      )}

      {/* Release Info */}
      <div className="mb-20 flex flex-col">
        <h2>Release Information</h2>
        
        <label htmlFor="releaseTitle">Release Title:</label>
        <input
          type="text"
          id="releaseTitle"
          value={releaseTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          disabled={disabled}
          className="disabled:opacity-50"
        />
        
        <label htmlFor="releaseDescription">Description (optional):</label>
        <textarea
          id="releaseDescription"
          value={releaseDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          className="disabled:opacity-50"
          style={{ minHeight: '80px', resize: 'vertical' }}
        />
        
        <label htmlFor="releaseType">Release Type:</label>
        <select
          id="releaseType"
          value={releaseType}
          onChange={(e) => onTypeChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '200px',
            padding: '4px',
            border: '2px inset #ccc',
            fontFamily: 'Courier New, monospace',
            fontSize: '14px',
            backgroundColor: 'white',
            opacity: disabled ? 0.5 : 1
          }}
        >
          <option value="single">Single</option>
          <option value="ep">EP</option>
          <option value="album">Album</option>
          <option value="demo">Demo</option>
        </select>
        
        <label htmlFor="releaseDate">Release Date (optional):</label>
        <input
          type="date"
          id="releaseDate"
          value={releaseDate}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '200px',
            padding: '4px',
            border: '2px inset #ccc',
            fontFamily: 'Courier New, monospace',
            fontSize: '14px',
            backgroundColor: 'white',
            opacity: disabled ? 0.5 : 1
          }}
        />
        <small>Leave blank to use upload date. Future dates will schedule the release.</small>
      </div>

      {/* Tags */}
      <div className="mb-20">
        <h2>Tags</h2>
        
        <label htmlFor="tags">Tags (comma-separated, optional):</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={handleTagsChange}
            onFocus={() => tags.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            disabled={disabled}
            className="disabled:opacity-50"
            placeholder="e.g. rock, indie, experimental"
            style={{
              width: '100%',
              padding: '8px',
              border: '2px inset #ccc',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          />
          <small style={{ display: 'block', fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Start typing to see suggestions from other releases
          </small>
          
          {showSuggestions && tagSuggestions.length > 0 && !disabled && (
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
              zIndex: 50
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
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <strong>{tag.name}</strong> {tag.count && `(${tag.count} release${tag.count !== 1 ? 's' : ''})`}
                </div>
              ))}
            </div>
          )}
        </div>
        {availableTags.length > 0 && (
          <small>
            Popular tags: {availableTags.slice(0, 10).map(tag => tag.name).join(', ')}
          </small>
        )}
      </div>

    </>
  )
}
