// Queue generation service

import { PlaybackQueue, QueueTrack, QueueGenerator } from '@/types/queue'

interface ApiTrack {
  id: string
  title: string
  trackNumber: number
  fileUrl: string
  duration: number | null
  _count: {
    listens: number
  }
}

interface ApiRelease {
  id: string
  title: string
  artworkUrl: string | null
  user: {
    username: string
  }
  tracks: ApiTrack[]
}

interface ApiTrackWithRelease {
  id: string
  title: string
  trackNumber: number
  fileUrl: string
  duration: number | null
  _count: {
    listens: number
  }
  release: {
    id: string
    title: string
    artworkUrl: string | null
    user: {
      username: string
    }
  }
}

class QueueGeneratorImpl implements QueueGenerator {
  
  async generateFromRelease(releaseId: string): Promise<PlaybackQueue> {
    try {
      const response = await fetch(`/api/releases/${releaseId}`)
      if (!response.ok) throw new Error('Failed to fetch release')
      
      const data = await response.json()
      const release: ApiRelease = data.release
      
      const tracks: QueueTrack[] = release.tracks
        .sort((a: ApiTrack, b: ApiTrack) => a.trackNumber - b.trackNumber)
        .map((track: ApiTrack) => ({
          id: track.id,
          title: track.title,
          artist: release.user.username,
          trackNumber: track.trackNumber,
          fileUrl: track.fileUrl,
          duration: track.duration,
          releaseId: release.id,
          releaseTitle: release.title,
          listenCount: track._count.listens,
          artworkUrl: release.artworkUrl,
          addedFrom: 'release' as const
        }))

      return {
        id: `release-${releaseId}-${Date.now()}`,
        tracks,
        currentIndex: 0,
        originalSource: {
          type: 'release',
          id: releaseId,
          name: release.title
        },
        shuffled: false,
        repeatMode: 'none',
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Failed to generate release queue:', error)
      throw error
    }
  }

  async generateShuffleAll(): Promise<PlaybackQueue> {
    try {
      // Fetch all tracks from all releases
      const response = await fetch('/api/tracks/all')
      if (!response.ok) throw new Error('Failed to fetch all tracks')
      
      const data = await response.json()
      const allTracks: ApiTrackWithRelease[] = data.tracks
      
      const tracks: QueueTrack[] = allTracks.map((track: ApiTrackWithRelease) => ({
        id: track.id,
        title: track.title,
        artist: track.release.user.username,
        trackNumber: track.trackNumber,
        fileUrl: track.fileUrl,
        duration: track.duration,
        releaseId: track.release.id,
        releaseTitle: track.release.title,
        listenCount: track._count.listens,
        artworkUrl: track.release.artworkUrl,
        addedFrom: 'shuffle' as const
      }))

      // Shuffle the tracks
      const shuffledTracks = this.shuffleArray([...tracks])

      return {
        id: `shuffle-all-${Date.now()}`,
        tracks: shuffledTracks,
        currentIndex: 0,
        originalSource: {
          type: 'shuffle_all',
          name: 'All Songs (Shuffled)'
        },
        shuffled: true,
        repeatMode: 'none',
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Failed to generate shuffle all queue:', error)
      throw error
    }
  }

  async generateFromPlaylist(playlistId: string): Promise<PlaybackQueue> {
    // Placeholder for future playlist support
    throw new Error('Playlist support not yet implemented')
  }

  generateFromTracks(tracks: QueueTrack[], sourceName?: string): PlaybackQueue {
    return {
      id: `custom-${Date.now()}`,
      tracks: [...tracks],
      currentIndex: 0,
      originalSource: {
        type: 'search',
        name: sourceName || 'Custom Queue'
      },
      shuffled: false,
      repeatMode: 'none',
      createdAt: new Date()
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

export const queueGenerator = new QueueGeneratorImpl()