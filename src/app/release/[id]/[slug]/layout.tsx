import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string; slug: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, slug } = await params
  
  try {
    // Fetch release data for meta tags
    const response = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/releases/${id}`, {
      cache: 'no-store' // Ensure fresh data for meta tags
    })

    if (!response.ok) {
      throw new Error('Failed to fetch release')
    }

    const data = await response.json()
    const release = data.release

    if (!release) {
      throw new Error('Release not found')
    }

    const title = `${release.title} by ${release.user.username}`
    const description = release.description || `Listen to "${release.title}" by ${release.user.username} on NBD`
    const imageUrl = release.artworkUrl ? 
      (release.artworkUrl.startsWith('http') ? release.artworkUrl : `${process.env.BASE_URL || 'http://localhost:3000'}${release.artworkUrl}`) :
      `${process.env.BASE_URL || 'http://localhost:3000'}/icon-512x512.png`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'music.album',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 1200,
            alt: `${release.title} by ${release.user.username}`
          }
        ],
        siteName: 'NBD',
        url: `${process.env.BASE_URL || 'http://localhost:3000'}/release/${id}/${slug}`
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl]
      }
    }
  } catch (error) {
    console.error('Error generating metadata for release:', error)
    
    // Fallback metadata
    return {
      title: 'Release - NBD',
      description: 'Release the music!!',
      openGraph: {
        title: 'Release - NBD',
        description: 'Release the music!!',
        type: 'website',
        images: [
          {
            url: `${process.env.BASE_URL || 'http://localhost:3000'}/icon-512x512.png`,
            width: 512,
            height: 512,
            alt: 'NBD'
          }
        ],
        siteName: 'NBD'
      }
    }
  }
}

export default function ReleaseLayout({ children }: Props) {
  return children
}