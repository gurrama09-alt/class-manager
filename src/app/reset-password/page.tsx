'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { getAuthErrorMessage } from '@/lib/utils'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { error: showError, success } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPw) { showError("Passwords don't match"); return }
    if (password.length < 8) { showError('Password must be at least 8 characters'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { showError(getAuthErrorMessage(error)); return }
      setDone(true)
      success('Password updated!')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      showError(getAuthErrorMessage(err))
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Reset Password</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Enter your new password below.</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={40} color="var(--accent-green)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Password Updated!</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'New Password', val: password, set: setPassword },
                { label: 'Confirm Password', val: confirmPw, set: setConfirmPw },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="label">{label}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="input"
                      style={{ paddingLeft: 36, paddingRight: 40 }}
                      placeholder="••••••••"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
