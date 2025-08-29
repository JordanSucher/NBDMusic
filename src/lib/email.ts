import { Resend } from 'resend'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
    console.warn('Resend not configured')
    console.warn('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
    console.warn('FROM_EMAIL present:', !!process.env.FROM_EMAIL)
    console.warn('FROM_EMAIL value:', process.env.FROM_EMAIL)
    console.log('📧 Email that would be sent:')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`HTML: ${html}`)
    return false
  }

  console.log(`Attempting to send email via Resend from ${process.env.FROM_EMAIL} to ${to}`)

  try {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: [to],
      subject: subject,
      html: html,
    })

    if (result.error) {
      console.error('Full Resend error object:', result.error)
      const errorMessage = result.error.message || result.error.name || 'Unknown error'
      throw new Error(`Resend error: ${errorMessage}`)
    }

    console.log(`✅ Email sent successfully to ${to} (ID: ${result.data?.id})`)
    return true
  } catch (error) {
    console.error('Failed to send email via Resend:', error)
    
    // In development, still show what would be sent
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email that would be sent:')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
    }
    
    return false
  }
}

export function createPasswordResetEmail(resetUrl: string, userEmail: string) {
  return {
    subject: 'Reset Your Password - nbd',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Courier New', monospace; font-size: 12px; color: #000; background-color: #fff; margin: 0; padding: 20px; line-height: 1.4;">
          
          <div style="border: 2px solid #000; padding: 15px; background-color: #fff; max-width: 600px;">
            
            <!-- Header -->
            <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
              <h1 style="margin: 0; font-size: 16px; font-weight: bold; font-family: 'Courier New', monospace;">nbd</h1>
              <div style="font-size: 10px; margin-top: 2px;">release the music!</div>
            </div>
            
            <!-- Main content -->
            <div style="margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Password Reset Request</strong></p>
              
              <p style="margin: 0 0 10px 0;">Account: ${userEmail}</p>
              
              <p style="margin: 0 0 15px 0;">Someone requested a password reset for your account. If this was you, click the link below:</p>
              
              <!-- Reset link in a box -->
              <div style="border: 1px solid #000; padding: 10px; margin: 15px 0; background-color: #f9f9f9;">
                <a href="${resetUrl}" style="color: #0000ff; text-decoration: underline; word-break: break-all; font-family: 'Courier New', monospace; font-size: 11px;">${resetUrl}</a>
              </div>
              
              <p style="margin: 0 0 10px 0;">This link expires in 1 hour.</p>
              
              <p style="margin: 0 0 15px 0;">If you didn't request this, ignore this email.</p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #666;">
              <p style="margin: 0;">nbd (no big deal) - automated email</p>
              <p style="margin: 5px 0 0 0;">Do not reply to this email.</p>
            </div>
            
          </div>
          
        </body>
      </html>
    `
  }
}