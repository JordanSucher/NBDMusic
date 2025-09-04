"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createReleaseUrl } from "@/utils/slugify"

// This page handles redirects for old-style URLs (/release/[id]) 
// to new-style URLs (/release/[id]/[slug])
export default function ReleaseRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const releaseId = params.id as string

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        // Fetch release data to generate proper slug
        const response = await fetch(`/api/releases/${releaseId}`)
        if (response.ok) {
          const data = await response.json()
          const release = data.release
          
          // Generate the proper URL with slug and redirect
          const newUrl = createReleaseUrl(release.id, release.title, release.user.username)
          router.replace(newUrl)
        } else {
          // If release not found, show 404
          console.error('Release not found')
          router.replace('/browse')
        }
      } catch (error) {
        console.error('Error fetching release for redirect:', error)
        router.replace('/browse')
      }
    }

    if (releaseId) {
      fetchAndRedirect()
    }
  }, [releaseId, router])

  // Show loading while redirecting
  return (
    <div className="container">
      <h1>Loading...</h1>
    </div>
  )
}