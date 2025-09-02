// Global audio player that persists across page navigation
class PersistentAudioPlayer {
  private audio: HTMLAudioElement | null = null
  private isInitialized = false

  private listeners: {
    onPlay?: () => void
    onPause?: () => void
    onTimeUpdate?: (currentTime: number, duration: number) => void
    onEnded?: () => void
    onLoadStart?: () => void
    onCanPlay?: () => void
  } = {}

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return

    this.audio = new Audio()
    this.audio.preload = 'metadata'
    
    // Set up event listeners
    this.audio.addEventListener('play', () => this.listeners.onPlay?.())
    this.audio.addEventListener('pause', () => this.listeners.onPause?.())
    this.audio.addEventListener('ended', () => this.listeners.onEnded?.())
    this.audio.addEventListener('loadstart', () => this.listeners.onLoadStart?.())
    this.audio.addEventListener('canplay', () => this.listeners.onCanPlay?.())
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.listeners.onTimeUpdate?.(this.audio.currentTime, this.audio.duration)
      }
    })

    this.isInitialized = true
  }

  setSource(src: string) {
    if (!this.audio) return
    if (this.audio.src === src) return // Don't reload same source
    
    this.audio.src = src
    this.audio.load()
  }

  private playPromise: Promise<void> | null = null

  async play() {
    if (!this.audio) return Promise.resolve()
    
    try {
      // Wait for any existing play promise to complete
      if (this.playPromise) {
        await this.playPromise.catch(() => {}) // Ignore errors from previous play
      }
      
      // Start new play operation
      this.playPromise = this.audio.play()
      await this.playPromise
      this.playPromise = null
    } catch (error) {
      this.playPromise = null
      console.log('Play interrupted or failed:', error)
      throw error
    }
  }

  pause() {
    if (!this.audio) return
    
    // Cancel any pending play operation
    if (this.playPromise) {
      this.playPromise = null
    }
    
    this.audio.pause()
  }

  setCurrentTime(time: number) {
    if (this.audio) {
      this.audio.currentTime = time
    }
  }

  getCurrentTime() {
    return this.audio?.currentTime || 0
  }

  getDuration() {
    return this.audio?.duration || 0
  }

  getCurrentSource() {
    return this.audio?.src || ''
  }

  isPaused() {
    return this.audio?.paused ?? true
  }

  isEnded() {
    return this.audio?.ended ?? true
  }

  setListeners(listeners: typeof this.listeners) {
    this.listeners = listeners
  }

  destroy() {
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio.load()
      this.audio = null
    }
    this.isInitialized = false
    this.listeners = {}
  }
}

// Create a singleton instance
export const persistentAudioPlayer = new PersistentAudioPlayer()