'use client'

import React, { useState, useMemo } from 'react'
import {
  Users, AlertCircle, BarChart3, Download, Search, Filter,
  Eye, Trash2, FileArchive, ChevronDown
} from 'lucide-react'
import { formatFileSize, formatDateTime } from '@/lib/utils'
import { useToast } from '@/components/providers/ToastProvider'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Presentation, AcademicSettings } from '@/types/database'

interface Props {
  presentations: Presentation[]
  subjects: { id: string; name: string; code: string }[]
  sections: { id: string; name: string }[]
  settings: AcademicSettings | null
}

export default function PresentationsTab({ presentations, subjects, sections, settings }: Props) {
  const { success, error: showError } = useToast()
  const [search, setSearch]         = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [viewSubject, setViewSubject]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [localPres, setLocalPres] = useState(presentations)

  const expected = settings?.expected_student_count ?? 60
  const academicYear = settings?.academic_year ?? '2024-25'

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = localPres.length
    // Unique students who uploaded (by roll_number)
    const uploadedRolls = new Set(localPres.map((p) => p.roll_number))
    const studentsUploaded = uploadedRolls.size
    const pendingStudents = Math.max(0, expected - studentsUploaded)
    const percentage = expected > 0 ? Math.round((studentsUploaded / expected) * 100) : 0
    return { total, studentsUploaded, pendingStudents, percentage }
  }, [localPres, expected])

  // ── Pending roll numbers ───────────────────────────────────────────────────
  const uploadedRolls = useMemo(() => new Set(localPres.map((p) => p.roll_number)), [localPres])
  const pendingRolls  = useMemo(() => {
    const rolls: number[] = []
    for (let i = 1; i <= expected; i++) {
      if (!uploadedRolls.has(i)) rolls.push(i)
    }
    return rolls
  }, [uploadedRolls, expected])

  // ── Per-subject counts ─────────────────────────────────────────────────────
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    localPres.forEach((p) => {
      if (p.subject_id) counts[p.subject_id] = (counts[p.subject_id] ?? 0) + 1
    })
    return counts
  }, [localPres])

  // ── Filtered list for modal ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = viewSubject ? localPres.filter((p) => p.subject_id === viewSubject) : localPres
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.student_name.toLowerCase().includes(q) || String(p.roll_number).includes(q))
    }
    if (filterSection) list = list.filter((p) => p.section_id === filterSection)
    return list
  }, [localPres, viewSubject, search, filterSection])

  // ── Download individual file ───────────────────────────────────────────────
  const handleDownload = async (presId: string) => {
    const res = await fetch(`/api/presentations/download?id=${presId}`)
    if (!res.ok) { showError('Download failed'); return }
    const blob = await res.blob()
    const pres = localPres.find((p) => p.id === presId)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = pres?.file_name ?? 'presentation.pptx'
    a.click()
  }

  // ── Download ZIP ───────────────────────────────────────────────────────────
  const handleZip = async (subjectId?: string) => {
    const url = subjectId
      ? `/api/presentations/zip?subject_id=${subjectId}&academic_year=${academicYear}`
      : `/api/presentations/zip?academic_year=${academicYear}`
    const res = await fetch(url)
    if (!res.ok) { showError('ZIP generation failed'); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = subjectId ? `${subjectId}_presentations.zip` : `all_presentations_${academicYear}.zip`
    a.click()
  }

  // ── Delete presentation ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return
    const res = await fetch(`/api/presentations/${confirmDelete}`, { method: 'DELETE' })
    if (res.ok) {
      setLocalPres((prev) => prev.filter((p) => p.id !== confirmDelete))
      success('Presentation deleted.')
    } else {
      showError('Delete failed')
    }
    setConfirmDelete(null)
  }

  const statCards = [
    { label: 'Total PPTs Uploaded', value: stats.total,          color: 'var(--accent-blue)',   bg: 'var(--accent-blue-dim)', icon: FileArchive },
    { label: 'Students Uploaded',   value: stats.studentsUploaded, color: 'var(--accent-green)', bg: 'var(--accent-green-dim)', icon: Users },
    { label: 'Pending Students',    value: stats.pendingStudents, color: 'var(--accent-amber)',  bg: 'var(--accent-amber-dim)', icon: AlertCircle },
    { label: 'Upload Percentage',   value: `${stats.percentage}%`, color: 'var(--accent-purple)', bg: 'var(--accent-purple-dim)', icon: BarChart3 },
  ]

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontWeight: 700, fontSize: 20 }}>Presentation Uploads</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Track and download student PPT submissions.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, margin: '20px 0' }}>
        {statCards.map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} color={color} />
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Progress panel */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Class Progress</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {stats.studentsUploaded} / {expected} students submitted
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {pendingRolls.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--accent-amber)', fontSize: 13, fontWeight: 600, listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={14} /> View Pending Rolls
                </summary>
                <div style={{ position: 'absolute', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, maxWidth: 320, zIndex: 10, marginTop: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Pending Roll Numbers ({pendingRolls.length})</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {pendingRolls.map((r) => (
                      <span key={r} style={{ padding: '2px 8px', background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{r}</span>
                    ))}
                  </div>
                </div>
              </details>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => handleZip()}>
              <Download size={14} /> Download All ZIP
            </button>
          </div>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${stats.percentage}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          <span>0</span>
          <span>{stats.percentage}%</span>
          <span>{expected}</span>
        </div>
      </div>

      {/* Subject cards */}
      <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>By Subject</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
        {subjects.map((sub) => {
          const count = subjectCounts[sub.id] ?? 0
          return (
            <div key={sub.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.code}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{sub.name}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--accent-blue)' }}>{count}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setViewSubject(sub.id === viewSubject ? null : sub.id)}>
                  <Eye size={13} /> {viewSubject === sub.id ? 'Hide' : 'View'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleZip(sub.id)} title="Download ZIP">
                  <Download size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Submission table */}
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
            {viewSubject ? `Submissions — ${subjects.find((s) => s.id === viewSubject)?.name}` : 'All Submissions'}
          </h3>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 30, height: 34, fontSize: 13, width: 200 }} placeholder="Name or roll…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ height: 34, fontSize: 13, width: 160 }} value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
            <option value="">All Sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {viewSubject && <button className="btn btn-ghost btn-sm" onClick={() => setViewSubject(null)}>Clear filter</button>}
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Users size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600 }}>No submissions found</p>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No.</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{p.roll_number}</td>
                    <td style={{ fontWeight: 500 }}>{p.student_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {(p as unknown as { sections?: { name: string } | null }).sections?.name ?? '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {(p as unknown as { subjects?: { code: string } | null }).subjects?.code ?? '—'}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 200 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{p.file_name}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatFileSize(p.file_size)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(p.submitted_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleDownload(p.id)} className="btn btn-ghost btn-sm" style={{ padding: 6 }} title="Download">
                          <Download size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(p.id)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-red)' }} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Presentation"
        description="This will permanently delete this presentation and its file."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  )
}
