'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoginSchema } from '@/lib/validators'
import { useToast } from '@/components/providers/ToastProvider'
import { getAuthErrorMessage } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { error: showError, success } = useToast()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = LoginSchema.safeParse({ identifier, password })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const raw = identifier.trim()
      const email = raw.includes('@') ? raw : `${raw.toLowerCase()}@ece.college`

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      })
      if (error) {
        showError(getAuthErrorMessage(error))
        return
      }
      success('Signed in successfully!')
      const redirect = params.get('redirect') ?? '/upload'
      router.push(redirect)
      router.refresh()
    } catch (err) {
      showError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--gradient-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <GraduationCap size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            CLASS MANAGEMENT
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Sign in with your Roll Number or Admin Email</p>
        </div>

        {/* Notice for Students */}
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid var(--accent-blue)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Students:</strong> Enter your Roll Number (e.g. <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>25MVECER0001</span>) for both Username and Password.
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label">Roll Number / Email</label>
              <div style={{ position: 'relative' }}>
                <GraduationCap size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: 36, textTransform: identifier.includes('@') ? 'none' : 'uppercase' }}
                  placeholder="25MVECER0001 or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              {errors.identifier && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{errors.identifier}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
            </div>

            <div style={{ textAlign: 'right' }}>
              <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--accent-blue)', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <ArrowRight size={16} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
