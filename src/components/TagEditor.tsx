"use client"

import { useState } from "react"

interface TagEditorProps {
  songId: string
  currentTags: string[]
  onTagsUpdated: (newTags: string[]) => void
}

export default function TagEditor({ songId, currentTags, onTagsUpdated }: TagEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newTagInput, setNewTagInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return

    const tagName = newTagInput.trim().toLowerCase()
    
    // Check if tag already exists
    if (currentTags.includes(tagName)) {
      setError("Tag already exists")
      return
    }

    setSaving(true)
    setError("")

    try {
      const response = await fetch(`/api/songs/${songId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagName }),
      })

      if (response.ok) {
        const updatedTags = [...currentTags, tagName]
        onTagsUpdated(updatedTags)
        setNewTagInput("")
      } else {
        const data = await response.json()
        setError(data.error || "Failed to add tag")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTag = async (tagName: string) => {
    setSaving(true)
    setError("")

    try {
      const response = await fetch(`/api/songs/${songId}/tags`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagName }),
      })

      if (response.ok) {
        const updatedTags = currentTags.filter(tag => tag !== tagName)
        onTagsUpdated(updatedTags)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to remove tag")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div>
        <div className="song-tags">
          Tags: {currentTags.length > 0 ? (
            currentTags.map(tag => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))
          ) : (
            <span style={{ color: '#666', fontSize: '11px' }}>No tags</span>
          )}
          {" "}
          <button 
            onClick={() => setIsEditing(true)}
            style={{ fontSize: '11px', padding: '1px 4px' }}
          >
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: '8px', 
      backgroundColor: '#f9f9f9',
      marginTop: '5px'
    }}>
      <div style={{ marginBottom: '8px' }}>
        <strong>Edit Tags:</strong>
      </div>

      {error && <div className="error" style={{ fontSize: '11px' }}>{error}</div>}

      {/* Current Tags with Remove Buttons */}
      <div style={{ marginBottom: '8px' }}>
        {currentTags.length > 0 ? (
          currentTags.map(tag => (
            <span key={tag} style={{ 
              display: 'inline-block', 
              marginRight: '5px', 
              marginBottom: '3px' 
            }}>
              <span className="tag">{tag}</span>
              <button
                onClick={() => handleRemoveTag(tag)}
                disabled={saving}
                style={{
                  fontSize: '10px',
                  padding: '1px 3px',
                  marginLeft: '2px',
                  backgroundColor: '#ff6666',
                  color: 'white'
                }}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <div style={{ fontSize: '11px', color: '#666' }}>No tags yet</div>
        )}
      </div>

      {/* Add New Tag */}
      <div style={{ marginBottom: '8px' }}>
        <input
          type="text"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          placeholder="Add new tag..."
          style={{ 
            width: '150px', 
            fontSize: '11px', 
            padding: '2px 4px',
            marginRight: '5px'
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
        />
        <button
          onClick={handleAddTag}
          disabled={saving || !newTagInput.trim()}
          style={{ fontSize: '11px', padding: '2px 6px' }}
        >
          Add
        </button>
      </div>

      {/* Done Button */}
      <div>
        <button
          onClick={() => setIsEditing(false)}
          style={{ fontSize: '11px', padding: '2px 6px' }}
        >
          Done
        </button>
      </div>

      {saving && <div style={{ fontSize: '10px', color: '#666' }}>Saving...</div>}
    </div>
  )
}
