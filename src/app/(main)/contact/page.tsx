'use client'

import type { Metadata } from 'next'
import React, { useState } from 'react'
import { Mail, User, MessageSquare, Send, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import { ContactSchema } from '@/lib/validators'

export default function ContactPage() {
  const { error: showError, success } = useToast()
  const [form, setForm]   = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone]   = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsed = ContactSchema.safeParse(form)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      parsed.error.issues.forEach((e) => { if (e.path[0]) errs[String(e.path[0])] = e.message })
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        success('Message sent successfully!')
      } else {
        showError(data.error ?? 'Failed to send message')
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="container" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <CheckCircle size={48} color="var(--accent-green)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Message Sent!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Thank you for reaching out. We&apos;ll get back to you soon.</p>
          <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => { setDone(false); setForm({ name: '', email: '', subject: '', message: '' }) }}>
            Send Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Contact Us</h1>
        <p className="page-subtitle">Have a question or feedback? Send us a message.</p>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { key: 'name',    label: 'Your Name',     icon: User,           type: 'text', placeholder: 'Full name' },
            { key: 'email',   label: 'Email Address', icon: Mail,           type: 'email', placeholder: 'you@example.com' },
            { key: 'subject', label: 'Subject',       icon: MessageSquare,  type: 'text', placeholder: 'What is this about?' },
          ].map(({ key, label, icon: Icon, type, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div style={{ position: 'relative' }}>
                <Icon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type={type} className="input" style={{ paddingLeft: 34 }} placeholder={placeholder}
                  value={(form as Record<string, string>)[key]} onChange={set(key)} required />
              </div>
              {errors[key] && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{errors[key]}</p>}
            </div>
          ))}

          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={5} placeholder="Write your message here…" value={form.message} onChange={set('message')} style={{ resize: 'vertical' }} required />
            {errors.message && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{errors.message}</p>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={15} />}
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  )
}
