import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'

// Disable instant prerender validation — every route in this app performs
// per-request authentication and database queries (cookies, Supabase).
export const instant = false

export const metadata: Metadata = {
  title: {
    default: 'CLASS MANAGEMENT',
    template: '%s | CLASS MANAGEMENT',
  },
  description:
    'CLASS MANAGEMENT — The centralized academic platform for student presentation submissions and study resource management.',
  keywords: ['class management', 'academic', 'presentations', 'study resources', 'education'],
  authors: [{ name: 'CLASS MANAGEMENT' }],
  openGraph: {
    title: 'CLASS MANAGEMENT',
    description: 'Centralized academic management platform',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
