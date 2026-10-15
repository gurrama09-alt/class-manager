'use client'

import React, { useState, useMemo, useTransition, useCallback } from 'react'
import {
  Search, Filter, Upload, Download, Trash2, Edit3,
  ChevronUp, ChevronDown, BookOpen, FlaskConical, FileText, GraduationCap,
  X, Check, ExternalLink
} from 'lucide-react'
import { formatFileSize, formatDate, categoryLabel } from '@/lib/utils'
import { useToast } from '@/components/providers/ToastProvider'
import { deleteResource, getResourceDownloadUrl, updateResourceSequence } from './actions'
import UploadResourceModal from '@/components/resources/UploadResourceModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Resource, AcademicSettings } from '@/types/database'

const CATEGORY_CONFIG = {
  question_bank: { label: 'Question Bank', icon: BookOpen,      color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
  lab_manual:    { label: 'Lab Manual',    icon: FlaskConical,  color: 'var(--accent-blue)',  bg: 'var(--accent-blue-dim)' },
  assignments:   { label: 'Assignments',   icon: FileText,       color: 'var(--accent-purple)',bg: 'var(--accent-purple-dim)' },
  syllabus:      { label: 'Syllabus',      icon: GraduationCap, color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
} as const

type Category = keyof typeof CATEGORY_CONFIG

interface Props {
  resources: Resource[]
  departments: { id: string; name: string }[]
  subjects: { id: string; name: string; code: string; semester: number }[]
  settings: AcademicSettings | null
  userRole: string
}

export default function ResourcesPageClient({ resources: initial, departments, subjects, settings, userRole }: Props) {
  const { success, error: showError } = useToast()
  const [resources, setResources] = useState(initial)
  const [search, setSearch]       = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [filterDept, setFilterDept] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showUpload, setShowUpload]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [, startTransition] = useTransition()

  const isAdmin = userRole === 'super_admin' || userRole === 'department_admin'

  // Counts per category
  const counts = useMemo(() => {
    const c: Record<string, number> = { question_bank: 0, lab_manual: 0, assignments: 0, syllabus: 0 }
    resources.forEach((r) => { c[r.category] = (c[r.category] ?? 0) + 1 })
    return c
  }, [resources])

  // Filtered resources
  const filtered = useMemo(() => {
    let list = resources
    if (activeCategory !== 'all') list = list.filter((r) => r.category === activeCategory)
    if (filterDept)     list = list.filter((r) => r.department_id === filterDept)
    if (filterSemester) list = list.filter((r) => String(r.semester) === filterSemester)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        (r as unknown as { subjects?: { name?: string } }).subjects?.name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [resources, activeCategory, filterDept, filterSemester, search])

  const handleDownload = async (id: string) => {
    const result = await getResourceDownloadUrl(id)
    if (!result.success || !result.url) { showError(result.error ?? 'Download failed'); return }
    const a = document.createElement('a')
    a.href = result.url
    a.download = result.filename ?? 'resource'
    a.click()
  }

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

  const handleMove = useCallback(async (id: string, dir: 'up' | 'down') => {
    const result = await updateResourceSequence(id, dir)
    if (result.success) {
      startTransition(() => {
        setResources((prev) => {
          const list = [...prev]
          const idx = list.findIndex((r) => r.id === id)
          const swapIdx = dir === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= list.length) return prev
          const temp = list[idx].sequence_number
          list[idx] = { ...list[idx], sequence_number: list[swapIdx].sequence_number }
          list[swapIdx] = { ...list[swapIdx], sequence_number: temp }
          return list.sort((a, b) => a.sequence_number - b.sequence_number)
        })
      })
    } else {
      showError(result.error ?? 'Reorder failed')
    }
  }, [showError])

  return (
    <div className="container">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">Study Resources</h1>
            <p className="page-subtitle">Browse and download Question Banks, Lab Manuals, Assignments, and Syllabus.</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={15} /> Upload Resource
            </button>
          )}
        </div>
      </div>

      {/* Category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          const isActive = activeCategory === key
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(isActive ? 'all' : key as Category)}
              className="stat-card"
              style={{
                textAlign: 'left', cursor: 'pointer', border: isActive ? `1px solid ${cfg.color}` : undefined,
                background: isActive ? cfg.bg : undefined,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={cfg.color} />
              </div>
              <div className="stat-value">{counts[key] ?? 0}</div>
              <div className="stat-label">{cfg.label}</div>
            </button>
          )
        })}
      </div>

      {/* Search & filters bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search resources…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className={`btn btn-secondary btn-sm ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={14} /> Filters
        </button>
        {isAdmin && (
          <button className={`btn btn-secondary btn-sm ${selectMode ? 'active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelected(new Set()) }}>
            <Check size={14} /> Select
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto', minWidth: 160 }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: 140 }} value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          {(filterDept || filterSemester) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDept(''); setFilterSemester('') }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Resource list grouped by category */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No resources found</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {search ? `No results for "${search}"` : 'No resources uploaded yet.'}
          </p>
        </div>
      ) : (
        Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const items = filtered.filter((r) => r.category === key)
          if (items.length === 0) return null
          const Icon = cfg.icon
          return (
            <div key={key} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} color={cfg.color} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>{cfg.label}</h2>
                <span className="badge badge-gray">{items.length}</span>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {selectMode && <th style={{ width: 40 }}></th>}
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Sem</th>
                      <th>Unit</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r, idx) => (
                      <tr key={r.id}>
                        {selectMode && (
                          <td>
                            <input type="checkbox" checked={selected.has(r.id)} onChange={(e) => {
                              const next = new Set(selected)
                              e.target.checked ? next.add(r.id) : next.delete(r.id)
                              setSelected(next)
                            }} />
                          </td>
                        )}
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.title}</div>
                          {r.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {(r as unknown as { subjects?: { name?: string } }).subjects?.name ?? '—'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.semester ?? '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.unit_number ?? '—'}</td>
                        <td>
                          <span className="badge badge-gray" style={{ fontSize: 10 }}>{r.file_type}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatFileSize(r.file_size)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(r.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => handleDownload(r.id)} className="btn btn-ghost btn-sm" style={{ padding: 6 }} title="Download">
                              <Download size={14} />
                            </button>
                            {isAdmin && (
                              <>
                                <button onClick={() => handleMove(r.id, 'up')} className="btn btn-ghost btn-sm" style={{ padding: 6 }} disabled={idx === 0} title="Move up">
                                  <ChevronUp size={14} />
                                </button>
                                <button onClick={() => handleMove(r.id, 'down')} className="btn btn-ghost btn-sm" style={{ padding: 6 }} disabled={idx === items.length - 1} title="Move down">
                                  <ChevronDown size={14} />
                                </button>
                                <button onClick={() => setConfirmDelete(r.id)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-red)' }} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadResourceModal
          departments={departments}
          subjects={subjects}
          settings={settings}
          onClose={() => setShowUpload(false)}
          onSuccess={(resource) => {
            setResources((prev) => [resource as unknown as Resource, ...prev])
            setShowUpload(false)
            success('Resource uploaded successfully!')
          }}
        />
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Resource"
        description="This will permanently delete the resource and its file. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  )
}
