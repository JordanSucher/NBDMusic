"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setEmail("") // Clear the form
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
          Forgot Password
        </h1>

        <p style={{ 
          marginBottom: '20px', 
          color: '#666',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label 
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold'
              }}
            >
              Email:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #000',
                fontSize: '16px',
                opacity: isLoading ? 0.7 : 1
              }}
              placeholder="Enter your email address"
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
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

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
          {' • '}
          <Link 
            href="/register"
            style={{ 
              color: '#0066cc',
              textDecoration: 'underline'
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}