export function createReleaseSlug(releaseTitle: string, artistName: string): string {
  const combined = `${artistName}-${releaseTitle}`
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length
}

export function createReleaseUrl(releaseId: string, releaseTitle: string, artistName: string): string {
  const slug = createReleaseSlug(releaseTitle, artistName)
  return `/release/${releaseId}/${slug}`
}