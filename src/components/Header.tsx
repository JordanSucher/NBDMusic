"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import NowPlayingBar from "./NowPlayingBar"

export default function Header() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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

  useEffect(() => {
    setIsHydrated(true)
    
    // Calculate header height after hydration
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight
      setHeaderHeight(height)
    }
  }, [])

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
    <>
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
        {/* Logo/Site Name */}
        <div
        className="flex flex-col">
          <Link 
            href="/" 
            style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              textDecoration: 'none',
              color: '#000',
              fontFamily: 'Courier New, monospace'
            }}
            onClick={closeMobileMenu}
          >
          nbd
          </Link>
          <span
          className="text-xs">
            release the music!
          </span>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          style={{
            display: 'none',
            background: 'none',
            border: '2px solid #000',
            padding: '5px 8px',
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            cursor: 'pointer',
            backgroundColor: '#ddd'
          }}
          className="mobile-menu-btn"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

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
          <Link href="/browse">Browse</Link>
          
          {session?.user ? (
            <>
              <Link href="/upload">Upload</Link>
              <Link href="/profile">Profile</Link>
              <button 
                onClick={() => signOut()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0000ff',
                  textDecoration: 'underline',
                  fontSize: '14px',
                  fontFamily: 'Courier New, monospace',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
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
              style={{
                padding: '8px 12px',
                border: '1px solid #000',
                backgroundColor: '#fff',
                textDecoration: 'none',
                color: '#000',
                textAlign: 'center'
              }}
            >
              Browse
            </Link>
            
            {session?.user ? (
              <>
                <Link 
                  href="/upload"
                  onClick={closeMobileMenu}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center'
                  }}
                >
                  Upload
                </Link>
                <Link 
                  href="/profile"
                  onClick={closeMobileMenu}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center'
                  }}
                >
                  Profile
                </Link>
                <button 
                  onClick={() => {
                    signOut()
                    closeMobileMenu()
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    fontSize: '14px',
                    fontFamily: 'Courier New, monospace',
                    cursor: 'pointer',
                    color: '#000'
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
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center'
                  }}
                >
                  Login
                </Link>
                <Link 
                  href="/register"
                  onClick={closeMobileMenu}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    textDecoration: 'none',
                    color: '#000',
                    textAlign: 'center'
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
          .mobile-menu-btn {
            display: none !important;
          }
          
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </header>
    <div style={{
      position: 'fixed',
      top: !isHydrated || isHeaderVisible ? `${headerHeight}px` : '0', // Always visible, positioned right after header
      left: '0',
      right: '0',
      zIndex: 200,
      transition: isHydrated ? 'top 0.3s ease-in-out' : 'none'
    }}>
      <NowPlayingBar isHeaderVisible={isHeaderVisible} />
    </div>
    </>
  )
}
