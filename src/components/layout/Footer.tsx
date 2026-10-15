'use client'

import React from 'react'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

const footerLinks = [
  { href: '/upload',    label: 'Upload' },
  { href: '/resources', label: 'Resources' },
  { href: '/about',     label: 'About' },
  { href: '/contact',   label: 'Contact' },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
      marginTop: 'auto',
      padding: '32px 0',
    }}>
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'var(--gradient-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>CLASS MANAGEMENT</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Academic Resource Platform</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {footerLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="footer-link">{label}</Link>
          ))}
        </nav>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © 2026 CLASS MANAGEMENT. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
