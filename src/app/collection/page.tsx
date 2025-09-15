"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import PlaylistsView from "@/components/PlaylistsView"

export default function CollectionsPage() {
  const { status } = useSession()
  const router = useRouter()

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null // Will redirect
  }

  return <PlaylistsView />
}