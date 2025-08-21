import { useState } from 'react'

export interface TrackData {
  file?: File
  title: string
  trackNumber: number
  lyrics: string
  // Edit-specific fields
  id?: string
  fileName?: string
  fileUrl?: string
  fileSize?: number
  mimeType?: string
  isNew?: boolean
  toDelete?: boolean
}

export function useReleaseForm() {
  const [releaseTitle, setReleaseTitle] = useState("")
  const [releaseDescription, setReleaseDescription] = useState("")
  const [releaseType, setReleaseType] = useState("single")
  const [releaseDate, setReleaseDate] = useState("")
  const [tags, setTags] = useState("")
  const [tracks, setTracks] = useState<TrackData[]>([])
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)

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

  const resetForm = () => {
    setReleaseTitle("")
    setReleaseDescription("")
    setReleaseDate("")
    setTracks([])
    setTags("")
    setArtworkFile(null)
    setArtworkPreview(null)
  }

  return {
    // State
    releaseTitle,
    releaseDescription,
    releaseType,
    releaseDate,
    tags,
    tracks,
    artworkFile,
    artworkPreview,
    // Setters
    setReleaseTitle,
    setReleaseDescription,
    setReleaseType,
    setReleaseDate,
    setTags,
    setTracks,
    setArtworkFile,
    setArtworkPreview,
    // Actions
    updateTrackTitle,
    updateTrackLyrics,
    removeTrack,
    moveTrackUp,
    moveTrackDown,
    resetForm
  }
}