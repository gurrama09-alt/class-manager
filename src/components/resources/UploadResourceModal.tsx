'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, UploadCloud, FileText } from 'lucide-react'
import { uploadResource } from '@/app/(main)/resources/actions'
import { formatFileSize } from '@/lib/utils'
import { useToast } from '@/components/providers/ToastProvider'
import type { AcademicSettings } from '@/types/database'

const CATEGORIES = [
  { value: 'question_bank', label: 'Question Bank' },
  { value: 'lab_manual',    label: 'Lab Manual' },
  { value: 'assignments',   label: 'Assignments' },
  { value: 'syllabus',      label: 'Syllabus' },
]

interface Props {
  departments: { id: string; name: string }[]
  subjects: { id: string; name: string; code: string; semester: number }[]
  settings: AcademicSettings | null
  onClose: () => void
  onSuccess: (resource: unknown) => void
}

export default function UploadResourceModal({ departments, subjects, settings, onClose, onSuccess }: Props) {
  const { error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    title: '',
    category: 'question_bank',
    department_id: '',
    section_id: '',
    subject_id: '',
    semester: '',
    unit_number: '',
    sequence_number: '1',
    academic_year: settings?.academic_year ?? '2024-25',
    description: '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    const maxMb = settings?.max_resource_size_mb ?? 50
    if (f.size > maxMb * 1024 * 1024) { showError(`File exceeds ${maxMb} MB limit`); return }
    setFile(f)
  }, [settings, showError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip'],
    },
    maxFiles: 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.department_id) errs.department_id = 'Department is required'
    if (!form.sequence_number || parseInt(form.sequence_number) < 1) errs.sequence_number = 'Sequence number required'
    if (!file) errs.file = 'Please select a file'
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      fd.append('file', file!)
      const result = await uploadResource(fd)
      if (result.success) {
        onSuccess(result.resource ?? {})
      } else {
        showError(result.error ?? 'Upload failed')
      }
    } catch (err: unknown) {
      console.error('[UploadResourceModal] Error:', err)
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 18 }}>Upload Resource</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Add a new study resource to the library.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 8 }}><X size={18} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Title */}
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label className="label">Resource Title *</label>
              <input className="input" placeholder="e.g., Unit 3 Question Bank" value={form.title} onChange={set('title')} />
              {fieldErrors.title && <p style={{ color: 'var(--accent-red)', fontSize: 12 }}>{fieldErrors.title}</p>}
            </div>

            {/* Category */}
            <div style={fieldStyle}>
              <label className="label">Category *</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Department */}
            <div style={fieldStyle}>
              <label className="label">Department *</label>
              <select className="input" value={form.department_id} onChange={set('department_id')}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {fieldErrors.department_id && <p style={{ color: 'var(--accent-red)', fontSize: 12 }}>{fieldErrors.department_id}</p>}
            </div>

            {/* Subject */}
            <div style={fieldStyle}>
              <label className="label">Subject</label>
              <select className="input" value={form.subject_id} onChange={set('subject_id')}>
                <option value="">Select subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>

            {/* Semester */}
            <div style={fieldStyle}>
              <label className="label">Semester</label>
              <select className="input" value={form.semester} onChange={set('semester')}>
                <option value="">Select semester</option>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            {/* Unit number */}
            <div style={fieldStyle}>
              <label className="label">Unit / Experiment Number</label>
              <input type="number" className="input" placeholder="e.g., 3" min={1} max={30} value={form.unit_number} onChange={set('unit_number')} />
            </div>

            {/* Sequence */}
            <div style={fieldStyle}>
              <label className="label">Sequence Number *</label>
              <input type="number" className="input" min={1} value={form.sequence_number} onChange={set('sequence_number')} />
              {fieldErrors.sequence_number && <p style={{ color: 'var(--accent-red)', fontSize: 12 }}>{fieldErrors.sequence_number}</p>}
            </div>

            {/* Academic Year */}
            <div style={fieldStyle}>
              <label className="label">Academic Year</label>
              <input className="input" placeholder="2024-25" value={form.academic_year} onChange={set('academic_year')} />
            </div>

            {/* Description */}
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label className="label">Description</label>
              <textarea className="input" rows={2} placeholder="Optional description…" value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} />
            </div>

            {/* File upload */}
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label className="label">File * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(PDF, DOC, PPT, XLS, ZIP — max {settings?.max_resource_size_mb ?? 50} MB)</span></label>
              {!file ? (
                <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ padding: 28 }}>
                  <input {...getInputProps()} />
                  <UploadCloud size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop file here or browse</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP</p>
                </div>
              ) : (
                <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={20} color="var(--accent-blue)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatFileSize(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-red)' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
              {fieldErrors.file && <p style={{ color: 'var(--accent-red)', fontSize: 12 }}>{fieldErrors.file}</p>}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : <><UploadCloud size={15} /> Upload Resource</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
