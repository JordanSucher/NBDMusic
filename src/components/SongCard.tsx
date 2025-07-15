import AudioPlayer from "./AudioPlayer"
import TagEditor from "./TagEditor"
import Link from "next/link"

interface SongCardProps {
  song: {
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
  showTagEditor?: boolean
  onTagsUpdated?: (songId: string, newTags: string[]) => void
}

export default function SongCard({ song, showTagEditor = false, onTagsUpdated }: SongCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="song-card">
      <div className="song-title">{song.title}</div>
      
      <div className="song-meta">
        By: <Link href={`/user/${encodeURIComponent(song.user.username)}`}>
          <strong>{song.user.username}</strong>
        </Link> | 
        Uploaded: {formatDate(song.uploadedAt)} | 
        Size: {formatFileSize(song.fileSize)}
      </div>

      {song.tags.length > 0 && !showTagEditor && (
        <div className="song-tags">
          Tags: {song.tags.map(songTag => (
            <span key={songTag.tag.name} className="tag">
              {songTag.tag.name}
            </span>
          ))}
        </div>
      )}

      {showTagEditor && onTagsUpdated && (
        <TagEditor
          songId={song.id}
          currentTags={song.tags.map(songTag => songTag.tag.name)}
          onTagsUpdated={(newTags) => onTagsUpdated(song.id, newTags)}
        />
      )}

      <AudioPlayer 
        src={song.fileUrl} 
        title={song.title}
        artist={song.user.username}
      />
    </div>
  )
}
