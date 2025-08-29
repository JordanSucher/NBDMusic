import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import NowPlayingBar from "@/components/NowPlayingBar"
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
  title: "nbd",
  description: "Release the music!!",
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
        </Providers>
      </body>
    </html>
  );
}
