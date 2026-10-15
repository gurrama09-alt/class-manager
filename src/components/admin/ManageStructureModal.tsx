'use client'

import React, { useState } from 'react'
import { X, Plus, Trash2, Edit3, Building2, Layers, BookOpen, Check } from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Department { id: string; name: string; code: string; is_active: boolean }
interface Section    { id: string; name: string; code?: string | null; department_id: string; departments?: { name: string } | null }
interface Subject    { id: string; name: string; code: string; semester: number; department_id: string; is_active: boolean; departments?: { name: string } | null }

interface Props {
  departments: unknown[]
  sections: unknown[]
  subjects: unknown[]
  onClose: () => void
}

type Tab = 'departments' | 'sections' | 'subjects'

export default function ManageStructureModal({ departments: initDepts, sections: initSecs, subjects: initSubs, onClose }: Props) {
  const { success, error: showError } = useToast()
  const [tab, setTab]         = useState<Tab>('departments')
  const [departments, setDepartments] = useState<Department[]>(initDepts as Department[])
  const [sections,    setSections]    = useState<Section[]>(initSecs as Section[])
  const [subjects,    setSubjects]    = useState<Subject[]>(initSubs as Subject[])
  const [loading,     setLoading]     = useState(false)
  const [confirmDel,  setConfirmDel]  = useState<{ type: Tab; id: string } | null>(null)

  // ── Departments ─────────────────────────────────────────────────────────────
  const [deptForm, setDeptForm] = useState({ name: '', code: '' })
  const [editDept, setEditDept] = useState<string | null>(null)

  const saveDept = async () => {
    if (!deptForm.name.trim() || !deptForm.code.trim()) return
    setLoading(true)
    const method = editDept ? 'PATCH' : 'POST'
    const url    = editDept ? `/api/admin/departments/${editDept}` : '/api/admin/departments'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deptForm) })
    const data   = await res.json()
    if (res.ok) {
      if (editDept) {
        setDepartments((prev) => prev.map((d) => d.id === editDept ? { ...d, ...deptForm } : d))
        success('Department updated.')
      } else {
        setDepartments((prev) => [...prev, data.department])
        success('Department added.')
      }
      setDeptForm({ name: '', code: '' })
      setEditDept(null)
    } else {
      showError(data.error ?? 'Operation failed')
    }
    setLoading(false)
  }

  // ── Sections ────────────────────────────────────────────────────────────────
  const [secForm, setSecForm] = useState({ department_id: '', name: '', code: '' })
  const [editSec, setEditSec] = useState<string | null>(null)

  const saveSec = async () => {
    if (!secForm.department_id || !secForm.name.trim()) return
    setLoading(true)
    const method = editSec ? 'PATCH' : 'POST'
    const url    = editSec ? `/api/admin/sections/${editSec}` : '/api/admin/sections'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(secForm) })
    const data   = await res.json()
    if (res.ok) {
      if (editSec) {
        setSections((prev) => prev.map((s) => s.id === editSec ? { ...s, ...secForm } : s))
        success('Section updated.')
      } else {
        setSections((prev) => [...prev, data.section])
        success('Section added.')
      }
      setSecForm({ department_id: '', name: '', code: '' })
      setEditSec(null)
    } else {
      showError(data.error ?? 'Operation failed')
    }
    setLoading(false)
  }

  // ── Subjects ────────────────────────────────────────────────────────────────
  const [subForm, setSubForm] = useState({ department_id: '', name: '', code: '', semester: '1', is_active: true })
  const [editSub, setEditSub] = useState<string | null>(null)

  const saveSub = async () => {
    if (!subForm.department_id || !subForm.name.trim() || !subForm.code.trim()) return
    setLoading(true)
    const method = editSub ? 'PATCH' : 'POST'
    const url    = editSub ? `/api/admin/subjects/${editSub}` : '/api/admin/subjects'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...subForm, semester: parseInt(subForm.semester) }) })
    const data   = await res.json()
    if (res.ok) {
      if (editSub) {
        setSubjects((prev) => prev.map((s) => s.id === editSub ? { ...s, ...subForm, semester: parseInt(subForm.semester) } : s))
        success('Subject updated.')
      } else {
        setSubjects((prev) => [...prev, data.subject])
        success('Subject added.')
      }
      setSubForm({ department_id: '', name: '', code: '', semester: '1', is_active: true })
      setEditSub(null)
    } else {
      showError(data.error ?? 'Operation failed')
    }
    setLoading(false)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDel) return
    const { type, id } = confirmDel
    const urls: Record<Tab, string> = {
      departments: `/api/admin/departments/${id}`,
      sections:    `/api/admin/sections/${id}`,
      subjects:    `/api/admin/subjects/${id}`,
    }
    const res = await fetch(urls[type], { method: 'DELETE' })
    if (res.ok) {
      if (type === 'departments') setDepartments((prev) => prev.filter((d) => d.id !== id))
      if (type === 'sections')    setSections((prev) => prev.filter((s) => s.id !== id))
      if (type === 'subjects')    setSubjects((prev) => prev.filter((s) => s.id !== id))
      success('Deleted successfully.')
    } else {
      showError('Delete failed')
    }
    setConfirmDel(null)
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1, padding: '8px 14px', border: 'none', background: tab === t ? 'var(--bg-card)' : 'transparent',
    color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: tab === t ? 700 : 500,
    borderRadius: 8, cursor: 'pointer', fontSize: 13, transition: 'all 150ms',
    boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
  })

  const inputRow: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 18 }}>Manage Academic Structure</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Add, edit, or remove departments, sections, and subjects.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 8 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-muted)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {([
              { key: 'departments', label: 'Departments', icon: Building2 },
              { key: 'sections',    label: 'Sections',    icon: Layers },
              { key: 'subjects',    label: 'Subjects',    icon: BookOpen },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} style={tabStyle(key)} onClick={() => setTab(key)}>
                <Icon size={13} style={{ display: 'inline', marginRight: 5 }} />{label}
              </button>
            ))}
          </div>

          {/* DEPARTMENTS */}
          {tab === 'departments' && (
            <div>
              <div style={inputRow}>
                <input className="input" style={{ flex: 2 }} placeholder="Department Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
                <input className="input" style={{ flex: 1 }} placeholder="Code (e.g. ECE)" value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} />
                <button className="btn btn-primary btn-sm" onClick={saveDept} disabled={loading}>
                  {editDept ? <><Check size={13} /> Update</> : <><Plus size={13} /> Add</>}
                </button>
                {editDept && <button className="btn btn-ghost btn-sm" onClick={() => { setEditDept(null); setDeptForm({ name: '', code: '' }) }}>Cancel</button>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {departments.map((d) => (
                  <div key={d.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building2 size={16} color="var(--accent-purple)" />
                    <span style={{ flex: 1, fontWeight: 500 }}>{d.name}</span>
                    <span className="badge badge-gray">{d.code}</span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: 5 }} onClick={() => { setEditDept(d.id); setDeptForm({ name: d.name, code: d.code }) }}><Edit3 size={13} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: 5, color: 'var(--accent-red)' }} onClick={() => setConfirmDel({ type: 'departments', id: d.id })}><Trash2 size={13} /></button>
                  </div>
                ))}
                {departments.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No departments yet.</p>}
              </div>
            </div>
          )}

          {/* SECTIONS */}
          {tab === 'sections' && (
            <div>
              <div style={inputRow}>
                <select className="input" style={{ flex: 1 }} value={secForm.department_id} onChange={(e) => setSecForm({ ...secForm, department_id: e.target.value })}>
                  <option value="">Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input className="input" style={{ flex: 1 }} placeholder="Section Name (e.g. A)" value={secForm.name} onChange={(e) => setSecForm({ ...secForm, name: e.target.value })} />
                <input className="input" style={{ flex: 0, width: 80 }} placeholder="Code" value={secForm.code} onChange={(e) => setSecForm({ ...secForm, code: e.target.value })} />
                <button className="btn btn-primary btn-sm" onClick={saveSec} disabled={loading}>
                  {editSec ? <><Check size={13} /> Update</> : <><Plus size={13} /> Add</>}
                </button>
                {editSec && <button className="btn btn-ghost btn-sm" onClick={() => { setEditSec(null); setSecForm({ department_id: '', name: '', code: '' }) }}>Cancel</button>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sections.map((s) => (
                  <div key={s.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Layers size={16} color="var(--accent-blue)" />
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.name}</span>
                    <span className="badge badge-gray">{departments.find((d) => d.id === s.department_id)?.name ?? '—'}</span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: 5 }} onClick={() => { setEditSec(s.id); setSecForm({ department_id: s.department_id, name: s.name, code: s.code ?? '' }) }}><Edit3 size={13} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: 5, color: 'var(--accent-red)' }} onClick={() => setConfirmDel({ type: 'sections', id: s.id })}><Trash2 size={13} /></button>
                  </div>
                ))}
                {sections.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No sections yet.</p>}
              </div>
            </div>
          )}

          {/* SUBJECTS */}
          {tab === 'subjects' && (
            <div>
              <div style={inputRow}>
                <select className="input" style={{ flex: 1 }} value={subForm.department_id} onChange={(e) => setSubForm({ ...subForm, department_id: e.target.value })}>
                  <option value="">Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input className="input" style={{ flex: 1 }} placeholder="Subject Name" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} />
                <input className="input" style={{ flex: 0, width: 90 }} placeholder="Code" value={subForm.code} onChange={(e) => setSubForm({ ...subForm, code: e.target.value.toUpperCase() })} />
                <select className="input" style={{ flex: 0, width: 100 }} value={subForm.semester} onChange={(e) => setSubForm({ ...subForm, semester: e.target.value })}>
                  {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={saveSub} disabled={loading}>
                  {editSub ? <><Check size={13} /> Update</> : <><Plus size={13} /> Add</>}
                </button>
                {editSub && <button className="btn btn-ghost btn-sm" onClick={() => { setEditSub(null); setSubForm({ department_id: '', name: '', code: '', semester: '1', is_active: true }) }}>Cancel</button>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subjects.map((s) => (
                  <div key={s.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOpen size={16} color="var(--accent-green)" />
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.name}</span>
                    <span className="badge badge-gray">{s.code}</span>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>Sem {s.semester}</span>
                    {!s.is_active && <span className="badge badge-red" style={{ fontSize: 10 }}>Inactive</span>}
                    <button className="btn btn-ghost btn-sm" style={{ padding: 5 }} onClick={() => { setEditSub(s.id); setSubForm({ department_id: s.department_id, name: s.name, code: s.code, semester: String(s.semester), is_active: s.is_active }) }}><Edit3 size={13} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: 5, color: 'var(--accent-red)' }} onClick={() => setConfirmDel({ type: 'subjects', id: s.id })}><Trash2 size={13} /></button>
                  </div>
                ))}
                {subjects.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No subjects yet.</p>}
              </div>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={!!confirmDel}
          title={`Delete ${confirmDel?.type.slice(0, -1) ?? 'item'}`}
          description="This may affect related resources or submissions. Proceed with caution."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          danger
        />
      </div>
    </div>
  )
}
