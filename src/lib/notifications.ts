interface NotificationPayload {
  groupName: string;
  message: string;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const response = await fetch('http://65.109.13.184:3000/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Notification API responded with status ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    // Don't throw the error - we don't want notification failures to break the upload
  }
}

export function createReleaseNotificationMessage(releaseTitle: string, username: string, releaseId: string): string {
  const slug = createReleaseSlug(releaseTitle, username);
  const releaseUrl = `https://early-bird.live/release/${releaseId}/${slug}`;
  return `🎵 New release dropped: "${releaseTitle}" by ${username} - ${releaseUrl}`;
}

function createReleaseSlug(releaseTitle: string, artistName: string): string {
  const combined = `${artistName}-${releaseTitle}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}