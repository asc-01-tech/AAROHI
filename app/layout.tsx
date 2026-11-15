import type { Metadata, Viewport } from 'next';
import { Nunito, Noto_Sans_Devanagari } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import MotionProvider from '@/components/MotionProvider';
import './globals.css';

// ─── Fonts ────────────────────────────────────────────────────────────────
// Nunito: rounded, friendly Latin letters (ideal for elder UI)
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-nunito',
});

// Noto Sans Devanagari: Hindi and Marathi must render correctly
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-devanagari',
});

// ─── Metadata ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Aarohi — Elderly Care & Medication Management',
  description:
    'Aarohi: A smart, collaborative healthcare platform for elders, caretakers and family. Medication reminders, voice assistant, prescription scan and more.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Aarohi',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: '/icons/icon-192.png',
    icon: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// ─── Root Layout ──────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${notoDevanagari.variable}`}>
      <head>
        {/* PWA service worker registration: production only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (let reg of regs) { reg.unregister(); }
                  });
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      for (let name of names) { caches.delete(name); }
                    });
                  }
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-gray-50 min-h-screen">
        <MotionProvider>
          {children}
        </MotionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
