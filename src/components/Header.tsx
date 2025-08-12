"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"

export default function Header() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header style={{
      borderBottom: '2px solid #000',
      padding: '10px 0',
      marginBottom: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Logo/Site Name */}
        <div>
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
            backgroundColor: '#f5f5f5',
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
  )
}
