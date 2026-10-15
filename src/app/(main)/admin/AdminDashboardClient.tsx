'use client'

import React, { useState, useMemo } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, GraduationCap, FlaskConical,
  Building2, BookMarked, Clock, Download, Layers,
  Upload, Settings, Users, ScrollText, MonitorPlay, BarChart3,
  ChevronDown, ChevronUp, Search, Filter, Trash2, Eye, RefreshCcw,
  Package, CheckCircle
} from 'lucide-react'
import { formatFileSize, formatDate, formatDateTime, categoryLabel } from '@/lib/utils'
import { useToast } from '@/components/providers/ToastProvider'
import { deleteResource, getResourceDownloadUrl } from '@/app/(main)/resources/actions'
import UploadResourceModal from '@/components/resources/UploadResourceModal'
import ManageStructureModal from '@/components/admin/ManageStructureModal'
import ManageAdminsModal from '@/components/admin/ManageAdminsModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PresentationsTab from '@/components/admin/PresentationsTab'
import type { Resource, Presentation as PresentationType, UserProfile, AcademicSettings } from '@/types/database'

interface Props {
  profile: UserProfile
  resources: Resource[]
  presentations: PresentationType[]
  departments: unknown[]
  subjects: unknown[]
  sections: unknown[]
  settings: AcademicSettings | null
  admins: unknown[]
  totalDownloads: number
}

export default function AdminDashboardClient({
  profile, resources: initial, presentations, departments, subjects, sections, settings, admins, totalDownloads,
}: Props) {
  const { success, error: showError } = useToast()
  const [resources, setResources] = useState(initial)
  const [activeTab, setActiveTab] = useState<'resources' | 'presentations'>('resources')
  const [showUpload,    setShowUpload]    = useState(false)
  const [showStructure, setShowStructure] = useState(false)
  const [showAdmins,    setShowAdmins]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [recentSearch, setRecentSearch]  = useState('')

  const isSuperAdmin = profile.role === 'super_admin'

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:        resources.length,
    questionBank: resources.filter((r) => r.category === 'question_bank').length,
    labManual:    resources.filter((r) => r.category === 'lab_manual').length,
    assignments:  resources.filter((r) => r.category === 'assignments').length,
    syllabus:     resources.filter((r) => r.category === 'syllabus').length,
    departments:  departments.length,
    subjects:     subjects.length,
    sections:     sections.length,
    recentUploads: resources.filter((r) => {
      const d = new Date(r.created_at)
      const now = new Date()
      return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
    }).length,
    totalDownloads,
  }), [resources, departments, subjects, sections, totalDownloads])

  const statCards = [
    { label: 'Total Resources',  value: stats.total,        icon: BookOpen,      color: 'var(--accent-blue)',   bg: 'var(--accent-blue-dim)' },
    { label: 'Question Banks',   value: stats.questionBank, icon: BookMarked,    color: 'var(--accent-green)',  bg: 'var(--accent-green-dim)' },
    { label: 'Lab Manuals',      value: stats.labManual,    icon: FlaskConical,  color: 'var(--accent-blue)',   bg: 'var(--accent-blue-dim)' },
    { label: 'Assignments',      value: stats.assignments,  icon: FileText,      color: 'var(--accent-purple)', bg: 'var(--accent-purple-dim)' },
    { label: 'Syllabus Files',   value: stats.syllabus,     icon: GraduationCap, color: 'var(--accent-amber)',  bg: 'var(--accent-amber-dim)' },
    { label: 'Departments',      value: stats.departments,  icon: Building2,     color: 'var(--accent-purple)', bg: 'var(--accent-purple-dim)' },
    { label: 'Subjects',         value: stats.subjects,     icon: BookOpen,      color: 'var(--accent-green)',  bg: 'var(--accent-green-dim)' },
    { label: 'Sections',         value: stats.sections,     icon: Layers,        color: 'var(--accent-blue)',   bg: 'var(--accent-blue-dim)' },
    { label: 'Recent Uploads',   value: stats.recentUploads,icon: Clock,         color: 'var(--accent-amber)',  bg: 'var(--accent-amber-dim)' },
    { label: 'Total Downloads',  value: totalDownloads,     icon: Download,      color: 'var(--accent-green)',  bg: 'var(--accent-green-dim)' },
  ]

  // ── Recent Resources ───────────────────────────────────────────────────────
  const recentResources = useMemo(() => {
    const q = recentSearch.toLowerCase()
    return resources
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((r) => !q || r.title.toLowerCase().includes(q))
      .slice(0, 20)
  }, [resources, recentSearch])

  const handleDelete = async () => {
    if (!confirmDelete) return
    const result = await deleteResource(confirmDelete)
    if (result.success) {
      setResources((prev) => prev.filter((r) => r.id !== confirmDelete))
      success('Resource deleted.')
    } else {
      showError(result.error ?? 'Delete failed')
    }
    setConfirmDelete(null)
  }

  const handleDownload = async (id: string) => {
    const result = await getResourceDownloadUrl(id)
    if (!result.success || !result.url) { showError(result.error ?? 'Download failed'); return }
    const a = document.createElement('a')
    a.href = result.url
    a.download = result.filename ?? 'resource'
    a.click()
  }

  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <LayoutDashboard size={22} color="var(--accent-purple)" />
              <h1 className="page-title" style={{ margin: 0 }}>Admin Dashboard</h1>
            </div>
            <p className="page-subtitle">Manage departments, resources, and administrator access.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '3px 10px', borderRadius: 99, background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)', fontSize: 12 }}>
              {profile.role === 'super_admin' ? 'Super Admin' : 'Department Admin'} — {profile.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={15} /> Upload Resource
            </button>
            <button className="btn btn-secondary" onClick={() => setShowStructure(true)}>
              <Settings size={15} /> Manage Structure
            </button>
            {isSuperAdmin && (
              <button className="btn btn-secondary" onClick={() => setShowAdmins(true)}>
                <Users size={15} /> Manage Admins
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} color={color} />
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>
          <BookOpen size={14} style={{ display: 'inline', marginRight: 6 }} />Resources
        </button>
        <button className={`tab-btn ${activeTab === 'presentations' ? 'active' : ''}`} onClick={() => setActiveTab('presentations')}>
          <MonitorPlay size={14} style={{ display: 'inline', marginRight: 6 }} />Presentations
        </button>
      </div>

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>Recent Resources</h2>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" style={{ paddingLeft: 30, height: 34, fontSize: 13, width: 220 }} placeholder="Search…" value={recentSearch} onChange={(e) => setRecentSearch(e.target.value)} />
            </div>
          </div>

          {recentResources.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <Package size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600 }}>No resources yet</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Upload your first resource using the button above.</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Subject</th>
                    <th>Semester</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResources.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.title}</div>
                        {r.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                      </td>
                      <td>
                        <span className={`badge ${r.category === 'question_bank' ? 'badge-green' : r.category === 'lab_manual' ? 'badge-blue' : r.category === 'assignments' ? 'badge-purple' : 'badge-amber'}`}>
                          {categoryLabel(r.category)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {(r as unknown as { subjects?: { name: string } | null }).subjects?.name ?? '—'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.semester ?? '—'}</td>
                      <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{r.file_type}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatFileSize(r.file_size)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(r.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleDownload(r.id)} className="btn btn-ghost btn-sm" style={{ padding: 6 }} title="Download">
                            <Download size={13} />
                          </button>
                          <button onClick={() => setConfirmDelete(r.id)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-red)' }} title="Delete">
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
      )}

      {/* Presentations Tab */}
      {activeTab === 'presentations' && (
        <PresentationsTab
          presentations={presentations}
          subjects={(subjects as { id: string; name: string; code: string }[])}
          sections={(sections as { id: string; name: string }[])}
          settings={settings}
        />
      )}

      {/* Modals */}
      {showUpload && (
        <UploadResourceModal
          departments={departments as { id: string; name: string }[]}
          subjects={subjects as { id: string; name: string; code: string; semester: number }[]}
          settings={settings}
          onClose={() => setShowUpload(false)}
          onSuccess={(res) => {
            setResources((prev) => [res as Resource, ...prev])
            setShowUpload(false)
            success('Resource uploaded!')
          }}
        />
      )}

      {showStructure && (
        <ManageStructureModal
          departments={departments}
          sections={sections}
          subjects={subjects}
          onClose={() => setShowStructure(false)}
        />
      )}

      {showAdmins && (
        <ManageAdminsModal
          admins={admins}
          departments={departments as { id: string; name: string }[]}
          onClose={() => setShowAdmins(false)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Resource"
        description="This will permanently delete the resource and its file. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  )
}
