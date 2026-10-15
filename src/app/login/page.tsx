import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginPage from './LoginPage'

export const metadata: Metadata = { title: 'Sign In' }

// useSearchParams in LoginPage requires Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    }>
      <LoginPage />
    </Suspense>
  )
}
