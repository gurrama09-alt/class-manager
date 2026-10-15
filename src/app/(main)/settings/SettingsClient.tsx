'use client'

import React, { useState } from 'react'
import { User, Shield, Sun, Moon, Settings, Save, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { useRouter } from 'next/navigation'
import type { UserProfile, AcademicSettings } from '@/types/database'

interface Props {
  profile: UserProfile | null
  settings: AcademicSettings | null
}

export default function SettingsClient({ profile, settings }: Props) {
  const { theme, toggle } = useTheme()
  const { success, error: showError } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'department_admin'
  const isSuperAdmin = profile?.role === 'super_admin'

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Academic settings state (super admin only)
  const [acadForm, setAcadForm] = useState({
    academic_year:          settings?.academic_year ?? '2024-25',
    expected_student_count: String(settings?.expected_student_count ?? 60),
    allow_resubmission:     settings?.allow_resubmission ?? false,
    max_ppt_size_mb:        String(settings?.max_ppt_size_mb ?? 100),
    max_resource_size_mb:   String(settings?.max_resource_size_mb ?? 50),
    completion_policy:      settings?.completion_policy ?? 'all',
  })
  const [savingAcad, setSavingAcad] = useState(false)

  const handleSaveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    const { error } = await (supabase.from('user_profiles') as ReturnType<typeof supabase.from>)
      .update({ full_name: fullName } as Record<string, unknown>)
      .eq('id', profile.id)
    if (error) showError('Failed to update profile')
    else success('Profile updated!')
    setSavingProfile(false)
  }

  const handleSaveAcad = async () => {
    setSavingAcad(true)
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academic_year:          acadForm.academic_year,
        expected_student_count: parseInt(acadForm.expected_student_count),
        allow_resubmission:     acadForm.allow_resubmission,
        max_ppt_size_mb:        parseInt(acadForm.max_ppt_size_mb),
        max_resource_size_mb:   parseInt(acadForm.max_resource_size_mb),
        completion_policy:      acadForm.completion_policy,
      }),
    })
    const data = await res.json()
    if (res.ok) success('Academic settings saved!')
    else showError(data.error ?? 'Save failed')
    setSavingAcad(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sectionTitle = (t: string) => (
    <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>{t}</h2>
  )

  return (
    <div className="container" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile, preferences, and academic configuration.</p>
      </div>

      {/* Profile */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        {sectionTitle('👤  Profile')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={profile?.email ?? ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div>
            <label className="label">Role</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)', fontSize: 12, fontWeight: 600 }}>
              <Shield size={12} />
              {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'department_admin' ? 'Department Admin' : 'Student'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        {sectionTitle('🎨  Appearance')}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Color Theme</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              Currently: <strong>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={toggle}>
            {theme === 'dark' ? <><Sun size={15} /> Switch to Light</> : <><Moon size={15} /> Switch to Dark</>}
          </button>
        </div>
      </div>

      {/* Academic settings (super admin only) */}
      {isSuperAdmin && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          {sectionTitle('🎓  Academic Settings')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">Academic Year</label>
              <input className="input" value={acadForm.academic_year} onChange={(e) => setAcadForm({ ...acadForm, academic_year: e.target.value })} placeholder="2024-25" />
            </div>
            <div>
              <label className="label">Expected Students</label>
              <input type="number" className="input" value={acadForm.expected_student_count} onChange={(e) => setAcadForm({ ...acadForm, expected_student_count: e.target.value })} min={1} max={1000} />
            </div>
            <div>
              <label className="label">Max PPT Size (MB)</label>
              <input type="number" className="input" value={acadForm.max_ppt_size_mb} onChange={(e) => setAcadForm({ ...acadForm, max_ppt_size_mb: e.target.value })} min={1} max={500} />
            </div>
            <div>
              <label className="label">Max Resource Size (MB)</label>
              <input type="number" className="input" value={acadForm.max_resource_size_mb} onChange={(e) => setAcadForm({ ...acadForm, max_resource_size_mb: e.target.value })} min={1} max={500} />
            </div>
            <div>
              <label className="label">Completion Policy</label>
              <select className="input" value={acadForm.completion_policy} onChange={(e) => setAcadForm({ ...acadForm, completion_policy: e.target.value })}>
                <option value="all">All subjects required</option>
                <option value="any">Any subject counts</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
              <input type="checkbox" id="resubmit" checked={acadForm.allow_resubmission} onChange={(e) => setAcadForm({ ...acadForm, allow_resubmission: e.target.checked })} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="resubmit" style={{ fontSize: 14, cursor: 'pointer' }}>Allow Resubmission</label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveAcad} disabled={savingAcad}>
              {savingAcad ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
              {savingAcad ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="card" style={{ padding: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
        {sectionTitle('⚠️  Account')}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Sign Out</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>End your current session.</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
