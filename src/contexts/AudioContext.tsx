// src/contexts/AudioContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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
  setActivePlayer: (playerId: string, track: ActiveTrack) => void;
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

  // Clear active player when navigating to a new page
  useEffect(() => {
    clearActivePlayer();
  }, [pathname, clearActivePlayer]);

  const setActivePlayer = useCallback((playerId: string, track: ActiveTrack) => {
    setActivePlayerId(playerId);
    setActiveTrack(track);
    setIsGloballyPlaying(true);
  }, []);

  const isActivePlayer = useCallback((playerId: string) => {
    return activePlayerId === playerId;
  }, [activePlayerId]);

  const setCurrentTrackIdCallback = useCallback((trackId: string | null) => {
    setCurrentTrackId(trackId);
  }, []);

  const setPlaying = useCallback((isPlaying: boolean) => {
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
    controlCallbacks.current.togglePlayPause?.();
  }, []);

  const seekToTime = useCallback((time: number) => {
    controlCallbacks.current.seekToTime?.(time);
  }, []);

  const nextTrack = useCallback(() => {
    controlCallbacks.current.onNext?.();
  }, []);

  const prevTrack = useCallback(() => {
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
