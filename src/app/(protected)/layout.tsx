'use client';

import { Navigation } from '@/components/Navigation';
import { AuthGuard } from '@/components/AuthGuard';
// import { VoiceAssistant } from '@/components/VoiceAssistant'; // Removed for modern layout
// import VoiceNarratorWidget from '@/components/VoiceNarratorWidget'; // Removed for modern layout
import { useTheme } from '@/hooks/useTheme';

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  useTheme(); // Apply saved theme settings

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-72 pt-16 lg:pt-0" role="main" tabIndex={-1}>
        {children}
      </main>
      {/* Voice components temporarily removed for modern layout */}
      {/* <VoiceAssistant /> */}
      {/* <VoiceNarratorWidget /> */}
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProtectedLayoutContent>
        {children}
      </ProtectedLayoutContent>
    </AuthGuard>
  );
}