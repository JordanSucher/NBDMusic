// src/app/release/[id]/[slug]/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import ReleaseCard from "@/components/ReleaseCard"

// Using the same Release interface as ReleaseCard expects
interface Release {
  id: string
  title: string
  description: string | null
  releaseType: string
  artworkUrl: string | null
  releaseDate: string | null
  uploadedAt: string
  user: {
    username: string
  }
  tags: {
    tag: {
      name: string
    }
  }[]
  tracks: {
    id: string
    title: string
    trackNumber: number
    fileName: string
    fileUrl: string
    fileSize: number
    duration: number | null
    mimeType: string
    lyrics: string | null
    _count: {
      listens: number
    }
  }[]
}

export default function ReleasePage() {
  const { data: session } = useSession()
  const params = useParams()
  const releaseId = params.id as string
  
  const [release, setRelease] = useState<Release | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showQR, setShowQR] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const qrButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const fetchRelease = async () => {
        try {
        const response = await fetch(`/api/releases/${releaseId}`)
        if (response.ok) {
            const data = await response.json()
            setRelease(data.release)
        } else if (response.status === 404) {
            setError("Release not found")
        } else {
            setError("Failed to load release")
        }
        } catch {
        setError("Something went wrong loading the release")
        } finally {
        setLoading(false)
        }
    }

    if (releaseId) {
      fetchRelease()
    }
  }, [releaseId])

  // Handle escape key to close QR modal
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showQR && e.key === 'Escape') {
        setShowQR(false)
        // Blur the QR button when closing modal with escape
        setTimeout(() => {
          qrButtonRef.current?.blur()
        }, 0)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [showQR])



  const copyShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    // Reset after 2 seconds
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const generateQRCode = () => {
    const url = window.location.href
    // Using a simple QR code service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
    return qrUrl
  }

  const downloadQRCode = async () => {
    try {
      const qrUrl = generateQRCode()
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${release?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'release'}-qr-code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download QR code:', error)
      // Fallback: open in new tab
      window.open(generateQRCode(), '_blank')
    }
  }



  if (loading) {
    return (
      <div className="container">
        <h1>Loading...</h1>
      </div>
    )
  }

  if (error || !release) {
    return (
      <div className="container">
        <h1>Release Not Found</h1>
        <div className="error">{error}</div>
        <p><Link href="/browse">← Back to browse</Link></p>
      </div>
    )
  }



  return (
    <div className="container">

      {/* Share buttons only */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        gap: '8px',
        marginBottom: '20px'
      }}>
        <button
          onClick={copyShareLink}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            color: linkCopied ? '#00aa00' : '#000',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            minWidth: '100px'
          }}
        >
          {linkCopied ? '✅ Copied!' : '📋 Copy Link'}
        </button>
        <button
          ref={(el) => { if (el) qrButtonRef.current = el }}
          onClick={() => setShowQR(true)}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            minWidth: '100px'
          }}
        >
          📱 QR Code
        </button>
      </div>

      {/* Audio player and track list - using ReleaseCard component */}
      <ReleaseCard release={release} />

      {/* QR Code Modal */}
      {showQR && (
        <div 
          onClick={() => {
            setShowQR(false)
            setTimeout(() => {
              qrButtonRef.current?.blur()
            }, 0)
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
            backgroundColor: 'white',
            padding: '20px',
            border: '2px solid #000',
            textAlign: 'center',
            width: '100%',
            maxWidth: '320px',
            maxHeight: '90vh',
            fontFamily: 'Courier New, monospace',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Share this release</h3>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: '15px' 
            }}>
              <img 
                src={generateQRCode()} 
                alt="QR Code for release"
                style={{ 
                  width: '100%',
                  maxWidth: '200px',
                  height: 'auto',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
              Scan with your phone to share
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              justifyContent: 'center' 
            }}>
              <button
                onClick={downloadQRCode}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  color: '#0066cc',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                📥 Download
              </button>
              <button
                onClick={() => {
                  setShowQR(false)
                  setTimeout(() => {
                    qrButtonRef.current?.blur()
                  }, 0)
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
