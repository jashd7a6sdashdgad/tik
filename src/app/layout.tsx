import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SettingsProvider } from "@/contexts/SettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mahboob Personal Assistant",
  description: "AI-powered personal assistant with Google integrations, voice commands, and smart automation",
  keywords: ["personal assistant", "AI", "productivity", "Google integration", "voice commands"],
  authors: [{ name: "Mahboob Personal Assistant" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} antialiased`}
      >
        <SettingsProvider>
          <ErrorBoundary>
            {children}
            {/* ARIA Live Region for Screen Reader Announcements */}
            <div 
              id="aria-live-region" 
              aria-live="polite" 
              aria-atomic="true"
              className="sr-only"
            ></div>
            <div 
              id="aria-live-assertive" 
              aria-live="assertive" 
              aria-atomic="true"
              className="sr-only"
            ></div>
          </ErrorBoundary>
        </SettingsProvider>
      </body>
    </html>
  );
}
