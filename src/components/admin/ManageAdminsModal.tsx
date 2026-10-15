'use client'

import React, { useState } from 'react'
import { X, Plus, UserPlus, Shield, ShieldOff, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { AdminAuthorization } from '@/types/database'

interface Props {
  admins: unknown[]
  departments: { id: string; name: string }[]
  onClose: () => void
}

const statusBadge = (status: string) => {
  if (status === 'active')      return <span className="badge badge-green"><CheckCircle size={10} /> Active</span>
  if (status === 'invited')     return <span className="badge badge-amber"><Clock size={10} /> Invited</span>
  if (status === 'deactivated') return <span className="badge badge-red"><XCircle size={10} /> Deactivated</span>
  return null
}

export default function ManageAdminsModal({ admins: initAdmins, departments, onClose }: Props) {
  const { success, error: showError } = useToast()
  const [admins, setAdmins] = useState<AdminAuthorization[]>(initAdmins as AdminAuthorization[])
  const [form, setForm]     = useState({ email: '', role: 'department_admin', department_id: '' })
  const [loading, setLoading] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleInvite = async () => {
    if (!form.email.trim()) { showError('Email is required'); return }
    if (form.role === 'department_admin' && !form.department_id) { showError('Select a department for dept admin'); return }
    setLoading(true)
    const res  = await fetch('/api/admin/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) {
      setAdmins((prev) => [data.admin, ...prev])
      setForm({ email: '', role: 'department_admin', department_id: '' })
      success('Admin invited successfully!')
    } else {
      showError(data.error ?? 'Invite failed')
    }
    setLoading(false)
  }

  const handleDeactivate = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate'
    const res = await fetch(`/api/admin/admins/${id}/${action}`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, status: data.status } : a))
      success(`Admin ${action}d.`)
    } else {
      showError(data.error ?? 'Operation failed')
    }
  }

  const handleRemove = async () => {
    if (!confirmDel) return
    const res = await fetch(`/api/admin/admins/${confirmDel}`, { method: 'DELETE' })
    if (res.ok) {
      setAdmins((prev) => prev.filter((a) => a.id !== confirmDel))
      success('Admin removed.')
    } else {
      showError('Remove failed — cannot remove the last super admin.')
    }
    setConfirmDel(null)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 18 }}>Manage Administrators</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Invite and manage admin access.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 8 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Invite form */}
          <div className="card" style={{ padding: 18, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Invite New Administrator</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <input className="input" style={{ flex: 2, minWidth: 180 }} type="email" placeholder="admin@example.com" value={form.email} onChange={set('email')} />
              <select className="input" style={{ flex: 1, minWidth: 140 }} value={form.role} onChange={set('role')}>
                <option value="department_admin">Department Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              {form.role === 'department_admin' && (
                <select className="input" style={{ flex: 1, minWidth: 140 }} value={form.department_id} onChange={set('department_id')}>
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleInvite} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <UserPlus size={14} />}
                {loading ? 'Inviting…' : 'Add & Invite'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
              An invitation email will be sent. The admin will be activated upon sign-in.
            </p>
          </div>

          {/* Admin list */}
          <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Authorized Administrators ({admins.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {admins.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No administrators yet.</p>
            )}
            {admins.map((a) => (
              <div key={a.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: a.role === 'super_admin' ? 'var(--accent-purple-dim)' : 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={16} color={a.role === 'super_admin' ? 'var(--accent-purple)' : 'var(--accent-blue)'} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {a.role === 'super_admin' ? 'Super Admin' : `Dept Admin${a.department_id ? ` — ${(a as unknown as { departments?: { name: string } | null }).departments?.name}` : ''}`}
                  </div>
                </div>
                {statusBadge(a.status)}
                <div style={{ display: 'flex', gap: 6 }}>
                  {a.status !== 'deactivated' ? (
                    <button className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-amber)' }} title="Deactivate"
                      onClick={() => handleDeactivate(a.id, a.status)}>
                      <ShieldOff size={13} />
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-green)' }} title="Re-activate"
                      onClick={() => handleDeactivate(a.id, a.status)}>
                      <Shield size={13} />
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-red)' }} title="Remove"
                    onClick={() => setConfirmDel(a.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ConfirmDialog
          open={!!confirmDel}
          title="Remove Administrator"
          description="This will revoke all admin access for this user. The last super admin cannot be removed."
          onConfirm={handleRemove}
          onCancel={() => setConfirmDel(null)}
          danger
          confirmText="Remove Admin"
        />
      </div>
    </div>
  )
}
