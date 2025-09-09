// Queue-based AudioContext - new architecture
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { persistentAudioPlayer } from '@/lib/PersistentAudioPlayer';
import { PlaybackQueue, QueueTrack, QueueManager } from '@/types/queue';
import { queueGenerator } from '@/lib/QueueGenerator';

interface QueueAudioContextType extends QueueManager {
  // Current playback state
  currentQueue: PlaybackQueue | null;
  currentTrack: QueueTrack | null;
  isGloballyPlaying: boolean;
  currentTime: number;
  duration: number;
  
  // Queue generation shortcuts
  playRelease: (releaseId: string, startTrackIndex?: number) => Promise<void>;
  playShuffleAll: () => Promise<void>;
  playTrack: (track: QueueTrack) => void;
  
  // Player control callbacks (for UI components)
  setPlayerToggleCallback: (togglePlayPause: () => void, restartTrack: () => void, seekToTime: (time: number) => void) => void;
  seekToTime: (time: number) => void;
  togglePlayPause: () => void;
}

const QueueAudioContext = createContext<QueueAudioContextType | null>(null);

export function QueueAudioProvider({ children }: { children: ReactNode }) {
  const [currentQueue, setCurrentQueue] = useState<PlaybackQueue | null>(null);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Use ref to avoid stale closure issues with event handlers
  const currentQueueRef = useRef<PlaybackQueue | null>(null);
  
  const pathname = usePathname();
  
  // Store callbacks for player controls
  const controlCallbacks = useRef<{
    togglePlayPause?: () => void;
    restartTrack?: () => void;
    seekToTime?: (time: number) => void;
  }>({});

  // Derived state
  const currentTrack = currentQueue && currentQueue.tracks[currentQueue.currentIndex] || null;

  // Update media session metadata
  const updateMediaSession = useCallback((track: QueueTrack | null) => {
    if ('mediaSession' in navigator && track) {
      const artwork = track.artworkUrl ? [
        { src: track.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        { src: track.artworkUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: track.artworkUrl, sizes: '128x128', type: 'image/jpeg' }
      ] : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.releaseTitle || 'Unknown Album',
        artwork: artwork
      });
    }
  }, []);

  // Update MediaSession position state
  const updatePositionState = useCallback(() => {
    if ('mediaSession' in navigator && currentTrack && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1.0,
          position: Math.min(currentTime, duration) // Ensure position doesn't exceed duration
        });
      } catch (error) {
        console.log('MediaSession setPositionState failed:', error);
      }
    }
  }, [currentTime, duration, currentTrack]);

  // Update media session when track changes
  useEffect(() => {
    updateMediaSession(currentTrack);
    // Reset position state when track changes
    if ('mediaSession' in navigator && currentTrack) {
      setTimeout(() => {
        updatePositionState();
      }, 100); // Small delay to ensure duration is loaded
    }
  }, [currentTrack, updateMediaSession, updatePositionState]);

  // Update position state when time/duration changes
  useEffect(() => {
    updatePositionState();
  }, [updatePositionState]);


  // Initialize persistent audio player
  useEffect(() => {
    persistentAudioPlayer.initialize()
    
    persistentAudioPlayer.setListeners({
      onPlay: () => {
        console.log('🎵 Queue: play event')
        setIsGloballyPlaying(true)
      },
      onPause: () => {
        console.log('⏸️ Queue: pause event')
        setIsGloballyPlaying(false)
      },
      onTimeUpdate: (currentTime, duration) => {
        setCurrentTime(currentTime)
        setDuration(duration)
      },
      onEnded: () => {
        console.log('⏹️ Queue: track ended, trying next')
        const didAdvance = nextTrack()
        console.log('⏹️ Queue: nextTrack returned:', didAdvance)
        if (!didAdvance) {
          // Only set playing to false if we couldn't advance to next track
          console.log('⏹️ Queue: Could not advance, stopping playback')
          setIsGloballyPlaying(false)
        }
      },
      onLoadStart: () => {
        console.log('📀 Queue: loading...')
      },
      onCanPlay: () => {
        console.log('✅ Queue: ready to play')
      }
    })

    return () => {
      // Don't destroy on unmount - we want it to persist
    }
  }, [])

  // Queue management functions
  const getCurrentQueue = useCallback((): PlaybackQueue | null => {
    return currentQueue;
  }, [currentQueue]);

  const setCurrentQueueCallback = useCallback((queue: PlaybackQueue): void => {
    console.log('🎮 Setting new queue:', queue.originalSource?.name, 'tracks:', queue.tracks.length)
    setCurrentQueue(queue);
    currentQueueRef.current = queue; // Keep ref in sync
    
    // Start playing the current track
    const track = queue.tracks[queue.currentIndex];
    if (track) {
      console.log('🎮 Loading track from queue:', track.title)
      persistentAudioPlayer.setSource(track.fileUrl);
    }
  }, []);

  const clearQueue = useCallback((): void => {
    console.log('🎮 Clearing queue')
    setCurrentQueue(null);
    currentQueueRef.current = null; // Keep ref in sync
    persistentAudioPlayer.pause();
  }, []);

  const goToTrack = useCallback((index: number, shouldAutoPlay?: boolean): void => {
    const queue = currentQueueRef.current; // Use ref to avoid stale closure
    if (!queue || index < 0 || index >= queue.tracks.length) {
      console.log('🎮 goToTrack: Invalid queue or index', { hasQueue: !!queue, index, length: queue?.tracks.length })
      return;
    }
    
    const wasPlaying = shouldAutoPlay !== undefined ? shouldAutoPlay : isGloballyPlaying;
    const newQueue = { ...queue, currentIndex: index };
    const track = newQueue.tracks[index];
    
    console.log('🎮 Going to track:', index, track.title, 'wasPlaying:', wasPlaying, 'shouldAutoPlay:', shouldAutoPlay)
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
    persistentAudioPlayer.setSource(track.fileUrl);
    
    if (wasPlaying) {
      console.log('🎮 Attempting to auto-play next track')
      persistentAudioPlayer.play().catch(error => {
        console.log('🎮 Auto-play after track change failed:', error)
      });
    } else {
      console.log('🎮 Not auto-playing - wasPlaying:', wasPlaying)
    }
  }, [isGloballyPlaying]);

  const nextTrack = useCallback((): boolean => {
    const queue = currentQueueRef.current; // Use ref to avoid stale closure
    if (!queue) {
      console.log('🎮 nextTrack: No current queue')
      return false;
    }
    
    console.log('🎮 nextTrack: Current index:', queue.currentIndex, 'of', queue.tracks.length, 'repeat:', queue.repeatMode)
    
    let nextIndex = queue.currentIndex + 1;
    
    // Handle repeat modes
    if (queue.repeatMode === 'track') {
      nextIndex = queue.currentIndex; // Stay on same track
      console.log('🎮 nextTrack: Repeat track mode, staying at', nextIndex)
    } else if (nextIndex >= queue.tracks.length) {
      if (queue.repeatMode === 'queue') {
        nextIndex = 0; // Loop back to start
        console.log('🎮 nextTrack: End of queue, looping to start')
      } else {
        console.log('🎮 nextTrack: End of queue reached, no repeat')
        return false; // End of queue
      }
    } else {
      console.log('🎮 nextTrack: Advancing to index', nextIndex)
    }
    
    goToTrack(nextIndex, true); // Force auto-play when advancing to next track
    
    // Reset playback position when changing tracks (but not when repeating same track)
    if (nextIndex !== queue.currentIndex) {
      persistentAudioPlayer.setCurrentTime(0);
    }
    
    return true;
  }, [goToTrack]);

  const prevTrack = useCallback((): boolean => {
    if (!currentQueue) return false;
    
    // If more than 10 seconds in, restart current track
    if (currentTime > 10) {
      persistentAudioPlayer.setCurrentTime(0);
      return true;
    }
    
    let prevIndex = currentQueue.currentIndex - 1;
    
    // Handle boundaries
    if (prevIndex < 0) {
      if (currentQueue.repeatMode === 'queue') {
        prevIndex = currentQueue.tracks.length - 1; // Loop to end
      } else {
        return false; // Beginning of queue
      }
    }
    
    goToTrack(prevIndex, true); // Force auto-play when going to previous track
    
    // Reset playback position when changing tracks
    persistentAudioPlayer.setCurrentTime(0);
    
    return true;
  }, [currentQueue, currentTime, goToTrack]);

  // Queue generation shortcuts
  const playRelease = useCallback(async (releaseId: string, startTrackIndex: number = 0): Promise<void> => {
    try {
      const queue = await queueGenerator.generateFromRelease(releaseId);
      queue.currentIndex = startTrackIndex;
      setCurrentQueueCallback(queue);
      // Auto-start playback
      persistentAudioPlayer.play().catch(error => {
        console.log('🎮 Auto-play release failed:', error)
      });
    } catch (error) {
      console.error('Failed to play release:', error);
    }
  }, [setCurrentQueueCallback]);

  const playShuffleAll = useCallback(async (): Promise<void> => {
    try {
      const queue = await queueGenerator.generateShuffleAll();
      setCurrentQueueCallback(queue);
      // Auto-start playback for shuffle all
      persistentAudioPlayer.play().catch(error => {
        console.log('🎮 Auto-play shuffle all failed:', error)
      });
    } catch (error) {
      console.error('Failed to play shuffle all:', error);
    }
  }, [setCurrentQueueCallback]);

  const playTrack = useCallback((track: QueueTrack): void => {
    const singleTrackQueue = queueGenerator.generateFromTracks([track], `Playing: ${track.title}`);
    setCurrentQueueCallback(singleTrackQueue);
  }, [setCurrentQueueCallback]);

  // Player control functions
  const setPlayerToggleCallback = useCallback((togglePlayPause: () => void, restartTrack: () => void, seekToTime: (time: number) => void) => {
    controlCallbacks.current.togglePlayPause = togglePlayPause;
    controlCallbacks.current.restartTrack = restartTrack;
    controlCallbacks.current.seekToTime = seekToTime;
  }, []);

  const togglePlayPause = useCallback(() => {
    console.log('🎮 Queue togglePlayPause called');
    
    if (persistentAudioPlayer.isPaused()) {
      persistentAudioPlayer.play()
    } else {
      persistentAudioPlayer.pause()
    }
  }, []);

  const seekToTime = useCallback((time: number) => {
    console.log('🎯 Queue seeking to:', time)
    persistentAudioPlayer.setCurrentTime(time)
  }, []);

  // Queue manipulation functions (for future use)
  const addTrackNext = useCallback((track: QueueTrack): void => {
    if (!currentQueue) return;
    const newTracks = [...currentQueue.tracks];
    newTracks.splice(currentQueue.currentIndex + 1, 0, track);
    const newQueue = { ...currentQueue, tracks: newTracks };
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
  }, [currentQueue]);

  const addTrackToEnd = useCallback((track: QueueTrack): void => {
    if (!currentQueue) return;
    const newTracks = [...currentQueue.tracks, track];
    const newQueue = { ...currentQueue, tracks: newTracks };
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
  }, [currentQueue]);

  const removeTrack = useCallback((index: number): void => {
    if (!currentQueue || index < 0 || index >= currentQueue.tracks.length) return;
    
    // Prevent removing the currently playing track
    if (index === currentQueue.currentIndex) {
      console.log('🎮 Cannot remove currently playing track');
      return;
    }
    
    const newTracks = currentQueue.tracks.filter((_, i) => i !== index);
    let newIndex = currentQueue.currentIndex;
    
    // Adjust current index if needed
    if (index < currentQueue.currentIndex) {
      newIndex--;
    }
    
    const newQueue = { ...currentQueue, tracks: newTracks, currentIndex: newIndex };
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
  }, [currentQueue]);

  const moveTrack = useCallback((fromIndex: number, toIndex: number): void => {
    if (!currentQueue || fromIndex < 0 || toIndex < 0 || 
        fromIndex >= currentQueue.tracks.length || toIndex >= currentQueue.tracks.length) return;
    
    const newTracks = [...currentQueue.tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    
    // Adjust current index
    let newCurrentIndex = currentQueue.currentIndex;
    if (fromIndex === currentQueue.currentIndex) {
      newCurrentIndex = toIndex;
    } else if (fromIndex < currentQueue.currentIndex && toIndex >= currentQueue.currentIndex) {
      newCurrentIndex--;
    } else if (fromIndex > currentQueue.currentIndex && toIndex <= currentQueue.currentIndex) {
      newCurrentIndex++;
    }
    
    const newQueue = { ...currentQueue, tracks: newTracks, currentIndex: newCurrentIndex };
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
  }, [currentQueue]);

  const shuffle = useCallback((): void => {
    if (!currentQueue) return;
    // Implement shuffle logic
    const currentTrack = currentQueue.tracks[currentQueue.currentIndex];
    const otherTracks = currentQueue.tracks.filter((_, i) => i !== currentQueue.currentIndex);
    
    // Shuffle other tracks
    for (let i = otherTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
    }
    
    const newTracks = [currentTrack, ...otherTracks];
    const newQueue = { 
      ...currentQueue, 
      tracks: newTracks, 
      currentIndex: 0,
      shuffled: true 
    };
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
  }, [currentQueue]);

  const unshuffle = useCallback((): void => {
    if (!currentQueue || !currentQueue.shuffled) return;
    // For now, just mark as unshuffled - could implement original order restoration
    const newQueue = { ...currentQueue, shuffled: false };
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
  }, [currentQueue]);

  const setRepeatMode = useCallback((mode: 'none' | 'queue' | 'track'): void => {
    if (!currentQueue) return;
    const newQueue = { ...currentQueue, repeatMode: mode };
    setCurrentQueue(newQueue);
    currentQueueRef.current = newQueue; // Keep ref in sync
  }, [currentQueue]);

  // Derived values for compatibility
  const hasNextTrack = currentQueue ? (currentQueue.currentIndex < currentQueue.tracks.length - 1 || currentQueue.repeatMode === 'queue') : false;
  const hasPrevTrack = currentQueue ? (currentQueue.currentIndex > 0 || currentQueue.repeatMode === 'queue') : false;

  // Set up media session action handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        persistentAudioPlayer.play();
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        persistentAudioPlayer.pause();
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrack();
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrack();
      });
      
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== null && details.seekTime !== undefined) {
          persistentAudioPlayer.setCurrentTime(details.seekTime);
        }
      });
    }
  }, [nextTrack, prevTrack]);

  return (
    <QueueAudioContext.Provider
      value={{
        // State
        currentQueue,
        currentTrack,
        isGloballyPlaying,
        currentTime,
        duration,
        
        // Queue management
        getCurrentQueue,
        setCurrentQueue: setCurrentQueueCallback,
        clearQueue,
        goToTrack,
        nextTrack,
        prevTrack,
        
        // Queue generation
        playRelease,
        playShuffleAll,
        playTrack,
        
        // Queue manipulation
        addTrackNext,
        addTrackToEnd,
        removeTrack,
        moveTrack,
        shuffle,
        unshuffle,
        setRepeatMode,
        
        // Player controls
        setPlayerToggleCallback,
        seekToTime,
        togglePlayPause,
      }}
    >
      {children}
    </QueueAudioContext.Provider>
  );
}

export function useQueueAudioContext() {
  const context = useContext(QueueAudioContext);
  if (!context) {
    throw new Error('useQueueAudioContext must be used within a QueueAudioProvider');
  }
  return context;
}