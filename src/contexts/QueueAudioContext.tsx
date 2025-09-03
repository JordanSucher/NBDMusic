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
  
  const pathname = usePathname();
  
  // Store callbacks for player controls
  const controlCallbacks = useRef<{
    togglePlayPause?: () => void;
    restartTrack?: () => void;
    seekToTime?: (time: number) => void;
  }>({});

  // Derived state
  const currentTrack = currentQueue && currentQueue.tracks[currentQueue.currentIndex] || null;

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
        setIsGloballyPlaying(false)
        nextTrack()
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
    persistentAudioPlayer.pause();
  }, []);

  const goToTrack = useCallback((index: number): void => {
    if (!currentQueue || index < 0 || index >= currentQueue.tracks.length) return;
    
    const wasPlaying = isGloballyPlaying;
    const newQueue = { ...currentQueue, currentIndex: index };
    const track = newQueue.tracks[index];
    
    console.log('🎮 Going to track:', index, track.title)
    setCurrentQueue(newQueue);
    persistentAudioPlayer.setSource(track.fileUrl);
    
    if (wasPlaying) {
      persistentAudioPlayer.play().catch(error => {
        console.log('🎮 Auto-play after track change failed:', error)
      });
    }
  }, [currentQueue, isGloballyPlaying]);

  const nextTrack = useCallback((): boolean => {
    if (!currentQueue) return false;
    
    let nextIndex = currentQueue.currentIndex + 1;
    
    // Handle repeat modes
    if (currentQueue.repeatMode === 'track') {
      nextIndex = currentQueue.currentIndex; // Stay on same track
    } else if (nextIndex >= currentQueue.tracks.length) {
      if (currentQueue.repeatMode === 'queue') {
        nextIndex = 0; // Loop back to start
      } else {
        console.log('🎮 End of queue reached')
        return false; // End of queue
      }
    }
    
    goToTrack(nextIndex);
    return true;
  }, [currentQueue, goToTrack]);

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
    
    goToTrack(prevIndex);
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
    setCurrentQueue({ ...currentQueue, tracks: newTracks });
  }, [currentQueue]);

  const addTrackToEnd = useCallback((track: QueueTrack): void => {
    if (!currentQueue) return;
    const newTracks = [...currentQueue.tracks, track];
    setCurrentQueue({ ...currentQueue, tracks: newTracks });
  }, [currentQueue]);

  const removeTrack = useCallback((index: number): void => {
    if (!currentQueue || index < 0 || index >= currentQueue.tracks.length) return;
    const newTracks = currentQueue.tracks.filter((_, i) => i !== index);
    let newIndex = currentQueue.currentIndex;
    
    // Adjust current index if needed
    if (index < currentQueue.currentIndex) {
      newIndex--;
    } else if (index === currentQueue.currentIndex && newTracks.length > 0) {
      // If removing current track, stay at same index (will play next track)
      newIndex = Math.min(newIndex, newTracks.length - 1);
    }
    
    setCurrentQueue({ ...currentQueue, tracks: newTracks, currentIndex: newIndex });
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
    
    setCurrentQueue({ ...currentQueue, tracks: newTracks, currentIndex: newCurrentIndex });
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
    setCurrentQueue({ 
      ...currentQueue, 
      tracks: newTracks, 
      currentIndex: 0,
      shuffled: true 
    });
  }, [currentQueue]);

  const unshuffle = useCallback((): void => {
    if (!currentQueue || !currentQueue.shuffled) return;
    // For now, just mark as unshuffled - could implement original order restoration
    setCurrentQueue({ ...currentQueue, shuffled: false });
  }, [currentQueue]);

  const setRepeatMode = useCallback((mode: 'none' | 'queue' | 'track'): void => {
    if (!currentQueue) return;
    setCurrentQueue({ ...currentQueue, repeatMode: mode });
  }, [currentQueue]);

  // Derived values for compatibility
  const hasNextTrack = currentQueue ? (currentQueue.currentIndex < currentQueue.tracks.length - 1 || currentQueue.repeatMode === 'queue') : false;
  const hasPrevTrack = currentQueue ? (currentQueue.currentIndex > 0 || currentQueue.repeatMode === 'queue') : false;

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