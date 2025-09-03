// src/components/providers.tsx
'use client';

import { SessionProvider } from "next-auth/react";
import { QueueAudioProvider } from "@/contexts/QueueAudioContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueueAudioProvider>
        {children}
      </QueueAudioProvider>
    </SessionProvider>
  );
}
