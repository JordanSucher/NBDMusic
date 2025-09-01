"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [step, setStep] = useState(1) // Track current step
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    // Move to step 2
    setStep(2)
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
          displayName: displayName || null,
          bio: bio || null,
          url: url || null,
        }),
      })

      if (response.ok) {
        router.push("/login?message=Account created successfully")
      } else {
        const data = await response.json()
        setError(data.error || "Something went wrong")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToStep1 = () => {
    setStep(1)
    setError("")
  }

  return (
    <div className="container">
      <h1>create account</h1>
      
      {/* Step indicator */}
      <div style={{ 
        marginBottom: '20px', 
        fontSize: '12px', 
        color: '#666',
        fontFamily: 'Courier New, monospace'
      }}>
        Step {step} of 2
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {step === 1 && (
        <form onSubmit={handleStep1Submit}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Account Details</h2>
          
          <div className="mb-10">
            <label htmlFor="email">Email:</label><br />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-10">
            <label htmlFor="username">Username:</label><br />
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <small>This will be your unique identifier on the platform</small>
          </div>

          <div className="mb-10">
            <label htmlFor="password">Password:</label><br />
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <small>Must be at least 6 characters</small>
          </div>

          <div className="mb-10">
            <label htmlFor="confirmPassword">Confirm Password:</label><br />
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit">
            Next: Profile Info →
          </button>
        </form>
      )}
      
      {step === 2 && (
        <form onSubmit={handleStep2Submit}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Profile Information</h2>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
            These fields are optional but help others discover and connect with you.
          </p>
          
          <div className="mb-10">
            <label htmlFor="displayName">Display Name:</label><br />
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your public display name"
            />
            <small>How your name appears to other users (optional)</small>
          </div>

          <div className="mb-10">
            <label htmlFor="bio">Bio:</label><br />
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              style={{
                width: '100%',
                padding: '4px',
                border: '2px inset #ccc',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                marginBottom: '10px',
                background: 'white',
                color: '#000',
                resize: 'vertical'
              }}
            />
            <small>A short description about yourself (optional)</small>
          </div>

          <div className="mb-10">
            <label htmlFor="url">Website/Social:</label><br />
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-website.com"
            />
            <small>Your website, social media, or other link (optional)</small>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              onClick={handleBackToStep1}
              style={{ backgroundColor: '#ddd', color: '#000' }}
            >
              ← Back
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {step === 1 && (
        <>
          <p>
            Already have an account? <Link href="/login">Login here</Link>
          </p>
          
          <p>
            <Link href="/">← Back to home</Link>
          </p>
        </>
      )}
    </div>
  )
}
