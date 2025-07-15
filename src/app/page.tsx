"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

export default function HomePage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="container">
        <h1>Early Bird</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>Early Bird</h1>
        <p>Local music demo sharing for musicians</p>
      </header>

      <nav>
        {session ? (
          <>
            <Link href="/upload">Upload Song</Link>
            <Link href="/browse">Browse Songs</Link>
            <Link href="/profile">My Profile</Link>
            <button onClick={() => signOut()}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
            <Link href="/browse">Browse Songs</Link>
          </>
        )}
      </nav>

      <main>
        {session?.user ? (
          <div>
            <h2>Welcome back, {session.user.name || session.user.email}!</h2>
            <p>What would you like to do today?</p>
            
            <div className="mb-20">
              <h3>Quick Actions:</h3>
              <ul>
                <li><Link href="/upload">Upload a new demo</Link></li>
                <li><Link href="/browse">Discover new music</Link></li>
                <li><Link href="/profile">Manage your songs</Link></li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <h2>Share Your Music</h2>
            <p>Early Bird is a simple platform for local musicians to share demos and works in progress.</p>
            
            <div className="mb-20">
              <h3>Features:</h3>
              <ul>
                <li>Upload your demos and songs in progress</li>
                <li>Tag your music for easy discovery</li>
                <li>Browse other local musicians&apos; work</li>
                <li>Simple, no-nonsense interface</li>
              </ul>
            </div>
            
            <p><Link href="/register">Create an account</Link> to get started.</p>
          </div>
        )}
      </main>

      <footer style={{ marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        <p>Early Bird gets the ear worm.</p>
      </footer>
    </div>
  )
}
