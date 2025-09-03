import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import NowPlayingBar from "@/components/NowPlayingBar"
import PWAInstallPrompt from "@/components/PWAInstallPrompt"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import "./globals.css";
import "../styles/dithered.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBD",
  description: "Release the music!!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NBD"
  },
  icons: [
    { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" }
  ]
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased fine-grain`}
      >
        <Providers>
          <Header />
          <main style={{ marginTop: '80px', paddingBottom: '80px' }}> {/* Header height at top, now playing bar height at bottom */}
            {children}
            <Footer />
          </main>
          <NowPlayingBar />
          <PWAInstallPrompt />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
