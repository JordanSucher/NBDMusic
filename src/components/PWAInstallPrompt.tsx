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
      
      // Only show if DEFINITELY mobile - very strict check
      const userAgent = navigator.userAgent
      const isAndroidMobile = /Android.*Mobile/i.test(userAgent)
      const isiPhone = /iPhone/i.test(userAgent)
      const isiPad = /iPad/i.test(userAgent)
      
      const isDefinitelyMobile = isAndroidMobile || isiPhone || isiPad
      
      console.log('PWA Check:', {
        userAgent,
        isAndroidMobile,
        isiPhone,
        isiPad,
        isDefinitelyMobile
      })
      
      if (isDefinitelyMobile) {
        setShowInstallButton(true)
      }
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
    <div 
      onClick={(e) => {
        // Close if clicking background
        if (e.target === e.currentTarget) {
          setShowInstallButton(false)
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        boxSizing: 'border-box',
        margin: 0
      } as React.CSSProperties}>
      <div style={{
        backgroundColor: '#fff',
        border: '3px solid #000',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        fontFamily: 'Courier New, monospace',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          📱
        </div>
        
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '15px',
          color: '#000'
        }}>
          Install NBD
        </h2>
        
        <p style={{
          fontSize: '16px',
          marginBottom: '30px',
          color: '#333',
          lineHeight: '1.4'
        }}>
          Add NBD to your home screen for quick access to your music!
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleInstallClick}
            style={{
              backgroundColor: '#4444ff',
              color: 'white',
              border: '3px outset #4444ff',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              borderRadius: '4px',
              minWidth: '120px'
            }}
          >
            📲 Install
          </button>
          <button
            onClick={() => setShowInstallButton(false)}
            style={{
              backgroundColor: '#ddd',
              color: '#000',
              border: '3px outset #ddd',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              borderRadius: '4px',
              minWidth: '120px'
            }}
          >
            Maybe Later
          </button>
        </div>
        
        <p style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '20px',
          lineHeight: '1.3'
        }}>
          Works offline • Fast loading • Native app experience
        </p>
      </div>
    </div>
  )
}