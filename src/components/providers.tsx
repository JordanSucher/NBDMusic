// src/components/providers.tsx
'use client';

import { SessionProvider } from "next-auth/react";
import { AudioProvider } from "@/contexts/AudioContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AudioProvider>
        {children}
      </AudioProvider>
    </SessionProvider>
  );
}
