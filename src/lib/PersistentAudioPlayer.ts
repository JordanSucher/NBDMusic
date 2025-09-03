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
    this.audio.preload = 'none' // Only load when explicitly requested
    
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

    // Mobile-specific handling for navigation interruptions
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      // Store playback state before potential interruption
      let wasPlayingBeforeHidden = false
      
      const handleVisibilityChange = () => {
        if (this.audio) {
          if (document.visibilityState === 'hidden') {
            wasPlayingBeforeHidden = !this.audio.paused
            console.log('🎮 Mobile: Page hidden, was playing:', wasPlayingBeforeHidden)
          } else if (document.visibilityState === 'visible' && wasPlayingBeforeHidden) {
            console.log('🎮 Mobile: Page visible, attempting to resume playback')
            // Small delay to ensure page is fully loaded
            setTimeout(() => {
              if (this.audio && this.audio.paused && wasPlayingBeforeHidden) {
                this.play().catch(error => {
                  console.log('🎮 Mobile: Could not resume playback after visibility change:', error)
                })
              }
            }, 100)
          }
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    this.isInitialized = true
  }

  setSource(src: string) {
    if (!this.audio) return
    
    // Normalize URLs for comparison (remove trailing slashes, etc.)
    const normalizedCurrentSrc = this.audio.src ? new URL(this.audio.src).href : ''
    const normalizedNewSrc = new URL(src, window.location.origin).href
    
    if (normalizedCurrentSrc === normalizedNewSrc) {
      console.log('🎮 PersistentAudioPlayer: Skipping setSource - same URL:', src)
      return // Don't reload same source
    }
    
    console.log('🎮 PersistentAudioPlayer: Setting new source:', src, 'was:', this.audio.src)
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