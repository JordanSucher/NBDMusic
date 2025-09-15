"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useQueueAudioContext } from "@/contexts/QueueAudioContext"
import CursorEyes from "@/components/BouncingNBD"

export default function Header() {
  const { data: session } = useSession()
  const queueAudio = useQueueAudioContext()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [lastScrollY, setLastScrollY] = useState(0)
  const headerRef = useRef<HTMLElement>(null)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const closeMoreMenu = () => {
    setIsMoreMenuOpen(false)
  }

  useEffect(() => {
    setIsHydrated(true)
    
    // Calculate header height after hydration
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight
      setHeaderHeight(height)
    }
  }, [])

  // Close menus when clicking outside or pressing ESC
  useEffect(() => {
    if (!isMobileMenuOpen && !isMoreMenuOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element
      
      // Close mobile menu if clicking anywhere except menu items or menu button
      if (isMobileMenuOpen) {
        const clickedOnMenuButton = target.closest('.mobile-menu-btn')
        const clickedOnMobileNav = target.closest('.mobile-nav')
        
        if (!clickedOnMenuButton && !clickedOnMobileNav) {
          setIsMobileMenuOpen(false)
        }
      }
      
      // Close more menu if clicking outside header
      if (isMoreMenuOpen && headerRef.current && !headerRef.current.contains(target)) {
        setIsMoreMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
        setIsMoreMenuOpen(false)
      }
    }

    const handleMouseDown = (event: MouseEvent) => handleClickOutside(event)
    const handleTouchStart = (event: TouchEvent) => handleClickOutside(event)

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen, isMoreMenuOpen])

  useEffect(() => {
    if (!isHydrated) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Always show header at the top
      if (currentScrollY < 10) {
        setIsHeaderVisible(true)
      } 
      // Show header when scrolling up
      else if (currentScrollY < lastScrollY) {
        setIsHeaderVisible(true)
      } 
      // Hide header when scrolling down (but not immediately)
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, isHydrated])

  return (
    <header 
      ref={headerRef}
      style={{
        position: 'fixed',
        top: !isHydrated || isHeaderVisible ? '0' : `-${headerHeight}px`,
        left: '0',
        right: '0',
        zIndex: 200,
        transition: isHydrated ? 'top 0.3s ease-in-out' : 'none',
        borderBottom: '1px solid #ccc',
        padding: '10px 0',
        backgroundColor: '#ffffff'
      }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Logo/Site Name with Eyes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Link 
            href="/" 
            style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              textDecoration: 'none',
              color: '#000',
              fontFamily: 'Courier New, monospace',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content',
              minHeight: '24px'
            }}
            onClick={closeMobileMenu}
            onTouchStart={(e) => {
              e.currentTarget.blur()
            }}
            onTouchEnd={(e) => {
              setTimeout(() => e.currentTarget.blur(), 10)
            }}
          >
            <span>nbd</span>
            <CursorEyes size="small" headerMode={true} />
          </Link>
          <span
          style={{ fontSize: '12px' }}>
            release the music!
          </span>
        </div>

        {/* Mobile Shuffle and Menu Buttons */}
        <div className="mobile-controls" style={{ display: 'none', alignItems: 'center', gap: '20px' }}>
          <span
            onClick={() => queueAudio.playShuffleAll()}
            style={{
              color: '#0000ff',
              textDecoration: 'none',
              fontSize: '30px',
              fontFamily: 'Courier New, monospace',
              cursor: 'pointer',
              display: 'inline',
              padding: 0,
              transform: 'translateY(3px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'black'
              e.currentTarget.style.backgroundColor = '#ffff00'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#0000ff'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title="Shuffle all songs"
          >
            🎲
          </span>
          
          <button
          onClick={toggleMobileMenu}
          onTouchStart={(e) => {
            const isMobile = window.innerWidth <= 768
            if (isMobile) {
              e.currentTarget.style.cssText = `
                display: block !important;
                background: none !important;
                border: 1px solid #ccc !important;
                padding: 5px 8px !important;
                font-size: 16px !important;
                font-family: 'Courier New', monospace !important;
                cursor: pointer !important;
                background-color: #d0d0d0 !important;
                width: 32px !important;
                text-align: center !important;
                box-shadow: none !important;
                border-style: solid !important;
                border-width: 1px !important;
                border-color: #ccc !important;
                outline: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
                -webkit-tap-highlight-color: transparent !important;
              `
            }
          }}
          onTouchEnd={(e) => {
            e.currentTarget.blur()
            const isMobile = window.innerWidth <= 768
            if (isMobile) {
              setTimeout(() => {
                e.currentTarget.style.cssText = `
                  display: block !important;
                  background: none !important;
                  border: 1px solid #ccc !important;
                  padding: 5px 8px !important;
                  font-size: 16px !important;
                  font-family: 'Courier New', monospace !important;
                  cursor: pointer !important;
                  background-color: ${isMobileMenuOpen ? '#e0e0e0' : '#f5f5f5'} !important;
                  width: 32px !important;
                  text-align: center !important;
                  box-shadow: none !important;
                  border-style: solid !important;
                  border-width: 1px !important;
                  border-color: #ccc !important;
                  outline: none !important;
                  -webkit-appearance: none !important;
                  -moz-appearance: none !important;
                  appearance: none !important;
                  -webkit-tap-highlight-color: transparent !important;
                `
              }, 100)
            }
          }}
          style={{
            display: 'none',
            background: 'none',
            border: '1px solid #ccc',
            padding: '5px 8px',
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            cursor: 'pointer',
            backgroundColor: isMobileMenuOpen ? '#e0e0e0' : '#f5f5f5',
            transition: 'background-color 0.2s ease',
            width: '32px',
            textAlign: 'center'
          }}
          onMouseEnter={(e) => {
            const isMobile = window.innerWidth <= 768
            if (isMobile) {
              e.currentTarget.style.cssText = `
                display: block !important;
                background: none !important;
                border: 1px solid #ccc !important;
                padding: 5px 8px !important;
                font-size: 16px !important;
                font-family: 'Courier New', monospace !important;
                cursor: pointer !important;
                background-color: #e0e0e0 !important;
                width: 32px !important;
                text-align: center !important;
                box-shadow: none !important;
                border-style: solid !important;
                border-width: 1px !important;
                border-color: #ccc !important;
                outline: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
              `
            } else {
              e.currentTarget.style.backgroundColor = '#e0e0e0'
            }
          }}
          onMouseLeave={(e) => {
            const isMobile = window.innerWidth <= 768
            if (isMobile) {
              e.currentTarget.style.cssText = `
                display: block !important;
                background: none !important;
                border: 1px solid #ccc !important;
                padding: 5px 8px !important;
                font-size: 16px !important;
                font-family: 'Courier New', monospace !important;
                cursor: pointer !important;
                background-color: ${isMobileMenuOpen ? '#e0e0e0' : '#f5f5f5'} !important;
                width: 32px !important;
                text-align: center !important;
                box-shadow: none !important;
                border-style: solid !important;
                border-width: 1px !important;
                border-color: #ccc !important;
                outline: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
              `
            } else {
              e.currentTarget.style.backgroundColor = isMobileMenuOpen ? '#e0e0e0' : '#f5f5f5'
            }
          }}
          className="mobile-menu-btn"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
        </div>

        {/* Desktop Navigation */}
        <nav 
          style={{ 
            display: 'flex', 
            gap: '15px', 
            alignItems: 'center',
            fontFamily: 'Courier New, monospace'
          }}
          className="desktop-nav"
        >
          {/* Shuffle All Link */}
          <span
            onClick={() => queueAudio.playShuffleAll()}
            style={{
              color: '#0000ff',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginRight: '20px',
              fontFamily: 'Courier New, monospace'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'black'
              e.currentTarget.style.backgroundColor = '#ffff00'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#0000ff'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title="Shuffle all songs"
          >
            Shuffle
          </span>
          
          <Link href="/browse">Browse</Link>
          
          {session?.user ? (
            <>
              <Link href="/collection">Collection</Link>
              
              <div style={{ position: 'relative' }}>
                <span
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  style={{
                    color: '#0000ff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'black';
                    e.currentTarget.style.backgroundColor = '#ffff00';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#0000ff';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  More ▼
                </span>
                
                {/* More Dropdown Menu */}
                {isMoreMenuOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '5px',
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '120px',
                      padding: '8px 0',
                      fontFamily: 'Courier New, monospace',
                      fontSize: '14px'
                    }}
                  >
                    <Link
                      href="/upload"
                      onClick={closeMoreMenu}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 16px',
                        color: '#0000ff',
                        textDecoration: 'none',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      Upload
                    </Link>
                    
                    <Link
                      href="/profile"
                      onClick={closeMoreMenu}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 16px',
                        color: '#0000ff',
                        textDecoration: 'none',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      Profile
                    </Link>
                    
                    <button
                      onClick={() => {
                        signOut()
                        closeMoreMenu()
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#0000ff',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: 'Courier New, monospace',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div 
          style={{
            marginTop: '6px',
            borderTop: '2px solid #000',
            backgroundColor: '#ffffff',
            padding: '15px 20px',
            display: 'none'
          }}
          className="mobile-nav"
        >
          <nav style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontFamily: 'Courier New, monospace',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <Link 
              href="/browse"
              onClick={closeMobileMenu}
              onTouchEnd={(e) => e.currentTarget.blur()}
              style={{
                padding: '8px 12px',
                border: '1px solid #000',
                backgroundColor: '#fff',
                textDecoration: 'none',
                color: '#000',
                textAlign: 'center',
                display: 'block',
                width: '100%'
              }}
            >
              Browse
            </Link>
            
            
            {session?.user ? (
              <>
                <Link 
                  href="/collection"
                  onClick={closeMobileMenu}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  Collection
                </Link>
                <Link 
                  href="/upload"
                  onClick={closeMobileMenu}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  Upload
                </Link>
                <Link 
                  href="/profile"
                  onClick={closeMobileMenu}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  Profile
                </Link>
                <button 
                  onClick={() => {
                    signOut()
                    closeMobileMenu()
                  }}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    fontSize: '14px',
                    fontFamily: 'Courier New, monospace',
                    cursor: 'pointer',
                    color: '#000',
                    textAlign: 'center',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login"
                  onClick={closeMobileMenu}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  Login
                </Link>
                <Link 
                  href="/register"
                  onClick={closeMobileMenu}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-controls {
            display: flex !important;
          }
          
          .mobile-menu-btn {
            display: block !important;
          }
          
          .desktop-nav {
            display: none !important;
          }
          
          .mobile-nav {
            display: block !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-controls {
            display: none !important;
          }
          
          .mobile-menu-btn {
            display: none !important;
          }
          
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
