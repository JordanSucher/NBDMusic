import React from 'react'

interface TrackFormProps {
  track: {
    title: string
    lyrics: string
    trackNumber: number
    file?: File
    fileName?: string
    fileSize?: number
    isNew?: boolean
    toDelete?: boolean
  }
  index: number
  disabled?: boolean
  onTitleChange: (index: number, title: string) => void
  onLyricsChange: (index: number, lyrics: string) => void
  onDelete?: (index: number) => void
  onMoveUp?: (index: number) => void
  onMoveDown?: (index: number) => void
  onToggleDelete?: (index: number) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  showReorder?: boolean
  formatFileSize?: (size: number) => string
  hideNewStatus?: boolean
}

export default function TrackForm({
  track,
  index,
  disabled = false,
  onTitleChange,
  onLyricsChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleDelete,
  canMoveUp = false,
  canMoveDown = false,
  showReorder = false,
  formatFileSize,
  hideNewStatus = false
}: TrackFormProps) {
  return (
    <div className="track-row" style={{
      opacity: track.toDelete ? 0.6 : 1,
      backgroundColor: track.toDelete ? '#fff0f0' : (track.isNew && !hideNewStatus) ? '#f0fff0' : '#fafafa'
    }}>
      {/* Track reorder buttons */}
      {showReorder && (
        <div className="track-reorder-buttons">
          <button
            type="button"
            onClick={() => onMoveUp?.(index)}
            disabled={!canMoveUp || disabled}
            className="track-move-btn move-up"
            style={{
              fontSize: '11px',
              padding: '2px 4px',
              cursor: (!canMoveUp || disabled) ? 'not-allowed' : 'pointer'
            }}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMoveDown?.(index)}
            disabled={!canMoveDown || disabled}
            className="track-move-btn move-down"
            style={{
              fontSize: '11px',
              padding: '2px 4px',
              cursor: (!canMoveDown || disabled) ? 'not-allowed' : 'pointer'
            }}
          >
            ↓
          </button>
        </div>
      )}

      <div className="track-number">Track {track.trackNumber}:</div>

      <div className="track-details">
        <input
          type="text"
          value={track.title}
          onChange={(e) => onTitleChange(index, e.target.value)}
          disabled={disabled || track.toDelete}
          className="track-title-input"
          placeholder="Track title"
        />
        <textarea
          value={track.lyrics}
          onChange={(e) => onLyricsChange(index, e.target.value)}
          disabled={disabled || track.toDelete}
          placeholder="Track lyrics (optional)"
          style={{
            width: '100%',
            minHeight: '60px',
            resize: 'vertical',
            marginTop: '5px',
            fontSize: '12px',
            fontFamily: 'Courier New, monospace'
          }}
          className={disabled || track.toDelete ? 'disabled:opacity-50' : ''}
        />
        <div className="track-info">
          {track.fileName || track.file?.name} ({formatFileSize ? formatFileSize(track.file?.size || track.fileSize || 0) : 'Unknown size'})
          {track.isNew && !hideNewStatus && <span className="track-status new"> • NEW</span>}
          {track.toDelete && <span className="track-status delete"> • WILL BE DELETED</span>}
        </div>
      </div>

      <div className="track-actions">
        {track.isNew && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(index)}
            disabled={disabled}
            style={{ 
              fontSize: '11px', 
              padding: '2px 4px',
              color: disabled ? '#999' : '#cc0000',
              cursor: disabled ? 'not-allowed' : 'pointer'
            }}
          >
            Remove
          </button>
        ) : onToggleDelete ? (
          <button
            type="button"
            onClick={() => onToggleDelete(index)}
            disabled={disabled}
            style={{
              fontSize: '11px',
              padding: '2px 4px',
              color: disabled ? '#999' : (track.toDelete ? '#00aa00' : '#cc0000'),
              cursor: disabled ? 'not-allowed' : 'pointer'
            }}
          >
            {track.toDelete ? 'Keep' : 'Delete'}
          </button>
        ) : null}
      </div>
    </div>
  )
}