'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Mail, ArrowLeft, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'

export default function ForgotPasswordPage() {
  const { error: showError, success } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) { showError(error.message); return }
      setSent(true)
      success('Password reset email sent!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <GraduationCap size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Forgot Password?</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>Check your email</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>We sent a password reset link to <strong>{email}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" className="input" style={{ paddingLeft: 36 }} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={15} />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
            <Link href="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={13} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
