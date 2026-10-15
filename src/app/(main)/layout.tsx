import React from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1, padding: '32px 0' }}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
