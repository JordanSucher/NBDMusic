import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendEmail, createPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: "If an account with that email exists, we've sent a password reset link." },
        { status: 200 }
      )
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour from now

    // Save reset token to database
    await db.passwordResetToken.create({
      data: {
        email: email.toLowerCase().trim(),
        token: resetToken,
        expires: expires,
      }
    })

    // Send password reset email
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    const emailData = createPasswordResetEmail(resetUrl, email)
    
    try {
      await sendEmail({
        to: email,
        subject: emailData.subject,
        html: emailData.html
      })
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      // Continue anyway - we don't want to reveal if email sending failed
    }

    return NextResponse.json(
      { message: "If an account with that email exists, we've sent a password reset link." },
      { status: 200 }
    )

  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    )
  }
}