"use client"

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowInstallButton(false)
    }
    
    setDeferredPrompt(null)
  }

  if (!showInstallButton) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '90px', // Above the now playing bar
      left: '20px',
      right: '20px',
      backgroundColor: '#fff',
      border: '2px solid #000',
      padding: '15px',
      zIndex: 1000,
      fontFamily: 'Courier New, monospace',
      fontSize: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '15px'
      }}>
        <div>
          <strong>Install NBD</strong>
          <br />
          Add to home screen for easier access
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleInstallClick}
            style={{
              backgroundColor: '#4444ff',
              color: 'white',
              border: '2px outset #4444ff',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace'
            }}
          >
            Install
          </button>
          <button
            onClick={() => setShowInstallButton(false)}
            style={{
              backgroundColor: '#ddd',
              color: '#000',
              border: '2px outset #ddd',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace'
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}