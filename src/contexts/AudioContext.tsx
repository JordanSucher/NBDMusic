// src/contexts/AudioContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { persistentAudioPlayer } from '@/lib/PersistentAudioPlayer';

interface ActiveTrack {
  src: string;
  title: string;
  artist: string;
  releaseId: string;
  trackIndex: number;
  playerId: string; // Unique identifier for the player instance
}

interface AudioContextType {
  activeTrack: ActiveTrack | null;
  isGloballyPlaying: boolean;
  currentTrackId: string | null;
  activePlayerId: string | null;
  currentTime: number;
  duration: number;
  hasNextTrack: boolean;
  hasPrevTrack: boolean;
  setActivePlayer: (playerId: string, track: ActiveTrack, forceSwitch?: boolean) => void;
  isActivePlayer: (playerId: string) => boolean;
  setCurrentTrackId: (trackId: string | null) => void;
  setPlaying: (isPlaying: boolean) => void;
  updateProgress: (currentTime: number, duration: number) => void;
  setTrackControls: (hasNext: boolean, hasPrev: boolean, onNext?: () => void, onPrev?: () => void) => void;
  setPlayerToggleCallback: (togglePlayPause: () => void, restartTrack: () => void, seekToTime: (time: number) => void) => void;
  seekToTime: (time: number) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  clearActivePlayer: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [activeTrack, setActiveTrack] = useState<ActiveTrack | null>(null);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasNextTrack, setHasNextTrack] = useState(false);
  const [hasPrevTrack, setHasPrevTrack] = useState(false);
  
  const pathname = usePathname();
  
  // Store callbacks for player controls
  const controlCallbacks = useRef<{
    onNext?: () => void;
    onPrev?: () => void;
    togglePlayPause?: () => void;
    restartTrack?: () => void;
    seekToTime?: (time: number) => void;
  }>({});

  const clearActivePlayer = useCallback(() => {
    setActiveTrack(null);
    setActivePlayerId(null);
    setIsGloballyPlaying(false);
    setCurrentTrackId(null);
    setCurrentTime(0);
    setDuration(0);
    setHasNextTrack(false);
    setHasPrevTrack(false);
    controlCallbacks.current = {};
  }, []);

  // Note: We intentionally don't clear the active player on navigation
  // to allow music playback to continue across pages

  // Initialize persistent audio player
  useEffect(() => {
    persistentAudioPlayer.initialize()
    
    persistentAudioPlayer.setListeners({
      onPlay: () => {
        console.log('🎵 Persistent player: play event')
        setIsGloballyPlaying(true)
      },
      onPause: () => {
        console.log('⏸️ Persistent player: pause event')
        setIsGloballyPlaying(false)
      },
      onTimeUpdate: (currentTime, duration) => {
        setCurrentTime(currentTime)
        setDuration(duration)
      },
      onEnded: () => {
        console.log('⏹️ Persistent player: ended')
        setIsGloballyPlaying(false)
        // Auto-advance to next track if available
        controlCallbacks.current.onNext?.()
      },
      onLoadStart: () => {
        console.log('📀 Persistent player: loading...')
      },
      onCanPlay: () => {
        console.log('✅ Persistent player: ready to play')
      }
    })

    return () => {
      // Don't destroy on unmount - we want it to persist
      // persistentAudioPlayer.destroy()
    }
  }, [])

  const setActivePlayer = useCallback((playerId: string, track: ActiveTrack, forceSwitch: boolean = false) => {
    console.log('🎮 Setting active player:', playerId, track)
    console.log('🎮 Current active track:', activeTrack)
    
    // If the same track is already playing, just update the playerId 
    // to maintain continuity when the same track appears on different pages
    if (activeTrack && activeTrack.src === track.src) {
      console.log('🎮 Same track, updating player ID from', activePlayerId, 'to', playerId)
      setActivePlayerId(playerId)
      setActiveTrack({ ...track, playerId }) // Update with new playerId
      // Don't call setSource again - it would restart the track
      return
    }
    
    // Don't switch to a different track if audio is currently playing
    // unless it's explicitly requested by user or within the same release
    if (activeTrack && isGloballyPlaying && activeTrack.src !== track.src && !forceSwitch) {
      // Allow track switches within the same release
      if (activeTrack.releaseId === track.releaseId) {
        console.log('🎮 Allowing track switch within same release:', activeTrack.releaseId)
      } else {
        console.log('🎮 Preventing track switch while playing. Current:', activeTrack.src, 'Requested:', track.src)
        return
      }
    }
    
    console.log('🎮 Setting new active track')
    setActivePlayerId(playerId);
    setActiveTrack(track);
    
    // Set the source on the persistent audio player
    persistentAudioPlayer.setSource(track.src)
  }, [activeTrack, activePlayerId, isGloballyPlaying]);

  const isActivePlayer = useCallback((playerId: string) => {
    return activePlayerId === playerId;
  }, [activePlayerId]);

  const setCurrentTrackIdCallback = useCallback((trackId: string | null) => {
    setCurrentTrackId(trackId);
  }, []);

  const setPlaying = useCallback((isPlaying: boolean) => {
    console.log('🎮 AudioContext setPlaying called with:', isPlaying);
    console.trace('🎮 AudioContext setPlaying call stack');
    setIsGloballyPlaying(isPlaying);
  }, []);

  const updateProgress = useCallback((currentTime: number, duration: number) => {
    setCurrentTime(currentTime);
    setDuration(duration);
  }, []);

  const setTrackControls = useCallback((hasNext: boolean, hasPrev: boolean, onNext?: () => void, onPrev?: () => void) => {
    setHasNextTrack(hasNext);
    setHasPrevTrack(hasPrev);
    controlCallbacks.current.onNext = onNext;
    controlCallbacks.current.onPrev = onPrev;
  }, []);

  const setPlayerToggleCallback = useCallback((togglePlayPause: () => void, restartTrack: () => void, seekToTime: (time: number) => void) => {
    controlCallbacks.current.togglePlayPause = togglePlayPause;
    controlCallbacks.current.restartTrack = restartTrack;
    controlCallbacks.current.seekToTime = seekToTime;
  }, []);

  const togglePlayPause = useCallback(() => {
    console.log('🎮 AudioContext togglePlayPause called');
    
    if (persistentAudioPlayer.isPaused()) {
      persistentAudioPlayer.play()
    } else {
      persistentAudioPlayer.pause()
    }
  }, []);

  const seekToTime = useCallback((time: number) => {
    console.log('🎯 AudioContext seeking to:', time)
    persistentAudioPlayer.setCurrentTime(time)
  }, []);

  const nextTrack = useCallback(() => {
    console.log('🎮 AudioContext nextTrack called - callback exists:', !!controlCallbacks.current.onNext)
    controlCallbacks.current.onNext?.();
  }, []);

  const prevTrack = useCallback(() => {
    console.log('🎮 AudioContext prevTrack called - currentTime:', currentTime, 'callback exists:', !!controlCallbacks.current.onPrev)
    // If more than 10 seconds in, restart current track
    if (currentTime > 10) {
      controlCallbacks.current.restartTrack?.();
    } else {
      controlCallbacks.current.onPrev?.();
    }
  }, [currentTime]);

  return (
    <AudioContext.Provider
      value={{
        activeTrack,
        isGloballyPlaying,
        currentTrackId,
        activePlayerId,
        currentTime,
        duration,
        hasNextTrack,
        hasPrevTrack,
        setActivePlayer,
        isActivePlayer,
        setCurrentTrackId: setCurrentTrackIdCallback,
        setPlaying,
        updateProgress,
        setTrackControls,
        setPlayerToggleCallback,
        seekToTime,
        togglePlayPause,
        nextTrack,
        prevTrack,
        clearActivePlayer,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}
