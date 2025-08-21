// src/contexts/AudioContext.tsx
'use client';

import { createContext, useContext, useRef, useState, ReactNode, useCallback } from 'react';

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
  registerPlayer: (playerId: string, onStop: () => void) => void;
  unregisterPlayer: (playerId: string) => void;
  requestPlay: (playerId: string, track: ActiveTrack) => boolean;
  setCurrentTrackId: (trackId: string | null) => void;
  notifyStop: (playerId: string) => void;
  notifyPlay: (playerId: string) => void;
  notifyPause: (playerId: string) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [activeTrack, setActiveTrack] = useState<ActiveTrack | null>(null);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const playerCallbacks = useRef<Map<string, () => void>>(new Map());

  const registerPlayer = useCallback((playerId: string, onStop: () => void) => {
    playerCallbacks.current.set(playerId, onStop);
  }, []);

  const unregisterPlayer = useCallback((playerId: string) => {
    playerCallbacks.current.delete(playerId);
    
    // If this was the active player, clear the active track
    if (activeTrack?.playerId === playerId) {
      setActiveTrack(null);
      setIsGloballyPlaying(false);
    }
  }, [activeTrack]);

  const requestPlay = useCallback((playerId: string, track: ActiveTrack) => {
    // Stop all other players
    playerCallbacks.current.forEach((stopCallback, id) => {
      if (id !== playerId) {
        stopCallback();
      }
    });

    // Set this as the active track
    setActiveTrack(track);
    setIsGloballyPlaying(true);
    
    return true;
  }, []);

  const setCurrentTrackIdCallback = useCallback((trackId: string | null) => {
    setCurrentTrackId(trackId);
  }, []);

  const notifyStop = useCallback((playerId: string) => {
    if (activeTrack?.playerId === playerId) {
      setIsGloballyPlaying(false);
    }
  }, [activeTrack]);

  const notifyPlay = useCallback((playerId: string) => {
    if (activeTrack?.playerId === playerId) {
      setIsGloballyPlaying(true);
    }
  }, [activeTrack]);

  const notifyPause = useCallback((playerId: string) => {
    if (activeTrack?.playerId === playerId) {
      setIsGloballyPlaying(false);
    }
  }, [activeTrack]);

  return (
    <AudioContext.Provider
      value={{
        activeTrack,
        isGloballyPlaying,
        currentTrackId,
        registerPlayer,
        unregisterPlayer,
        requestPlay,
        setCurrentTrackId: setCurrentTrackIdCallback,
        notifyStop,
        notifyPlay,
        notifyPause,
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
