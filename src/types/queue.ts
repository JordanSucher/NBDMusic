// Queue types and interfaces for playback management

export interface QueueTrack {
  id: string
  title: string
  artist: string
  trackNumber: number
  fileUrl: string
  duration: number | null
  releaseId: string
  releaseTitle: string
  listenCount: number
  // Additional metadata for queue display
  addedAt?: Date
  addedFrom?: 'release' | 'playlist' | 'search' | 'shuffle'
}

export interface PlaybackQueue {
  id: string
  tracks: QueueTrack[]
  currentIndex: number
  originalSource?: {
    type: 'release' | 'playlist' | 'shuffle_all' | 'search'
    id?: string
    name?: string
  }
  shuffled: boolean
  repeatMode: 'none' | 'queue' | 'track'
  createdAt: Date
}

export interface QueueGenerator {
  generateFromRelease(releaseId: string): Promise<PlaybackQueue>
  generateShuffleAll(): Promise<PlaybackQueue>
  generateFromPlaylist(playlistId: string): Promise<PlaybackQueue>
  generateFromTracks(tracks: QueueTrack[], source?: string): PlaybackQueue
}

export interface QueueManager {
  // Current queue management
  getCurrentQueue(): PlaybackQueue | null
  setCurrentQueue(queue: PlaybackQueue): void
  clearQueue(): void
  
  // Queue manipulation
  addTrackNext(track: QueueTrack): void
  addTrackToEnd(track: QueueTrack): void
  removeTrack(index: number): void
  moveTrack(fromIndex: number, toIndex: number): void
  
  // Playback control
  goToTrack(index: number): void
  nextTrack(): boolean
  prevTrack(): boolean
  
  // Queue modes
  shuffle(): void
  unshuffle(): void
  setRepeatMode(mode: 'none' | 'queue' | 'track'): void
}