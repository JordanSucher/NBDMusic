"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [token, setToken] = useState("")
  
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError("Invalid reset link. Please request a new password reset.")
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Password reset successfully! Redirecting to login...")
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token && !error) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{
        maxWidth: '400px',
        margin: '40px auto',
        padding: '20px',
        border: '2px solid #000',
        backgroundColor: '#fff'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          Reset Password
        </h1>

        {message && (
          <div style={{
            padding: '10px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {token && !message && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}
              >
                New Password:
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #000',
                  fontSize: '16px',
                  opacity: isLoading ? 0.7 : 1
                }}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor="confirmPassword"
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}
              >
                Confirm Password:
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #000',
                  fontSize: '16px',
                  opacity: isLoading ? 0.7 : 1
                }}
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: isLoading ? '#ccc' : '#000',
                color: '#fff',
                border: 'none',
                fontSize: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '15px'
              }}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{ 
          textAlign: 'center',
          fontSize: '14px'
        }}>
          <Link 
            href="/login"
            style={{ 
              color: '#0066cc',
              textDecoration: 'underline'
            }}
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}