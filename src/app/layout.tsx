import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SmartNarratorProvider } from "@/components/SmartNarratorProvider";
import PWAInit from "@/components/PWAInit";

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
  keywords: ["personal assistant", "AI", "productivity", "Google integration", "voice commands", "PWA", "offline"],
  authors: [{ name: "Mahboob Personal Assistant" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mahboob PA",
  },
  openGraph: {
    title: "Mahboob Personal Assistant",
    description: "AI-powered personal assistant with offline capabilities",
    type: "website",
    siteName: "Mahboob Personal Assistant",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mahboob Personal Assistant",
    description: "AI-powered personal assistant with offline capabilities",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Mahboob PA",
    "application-name": "Mahboob PA",
    "msapplication-TileColor": "#2563eb",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
          <SmartNarratorProvider>
            <ErrorBoundary>
              <PWAInit />
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
          </SmartNarratorProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
