'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GraduationCap, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RegisterSchema } from '@/lib/validators'
import { useToast } from '@/components/providers/ToastProvider'

export default function RegisterPage() {
  const router = useRouter()
  const { error: showError, success } = useToast()

  const [full_name, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = RegisterSchema.safeParse({ email, password, full_name })
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      })
      if (error) { showError(error.message); return }
      success('Account created! Please check your email to confirm.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <GraduationCap size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Create Account</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Join CLASS MANAGEMENT</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="input" style={{ paddingLeft: 36 }} placeholder="Your full name" value={full_name} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              {errors.full_name && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{errors.full_name}</p>}
            </div>

            <div>
              <label className="label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" className="input" style={{ paddingLeft: 36 }} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {errors.email && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <ArrowRight size={16} />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
