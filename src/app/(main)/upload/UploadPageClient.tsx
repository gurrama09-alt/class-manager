'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  UploadCloud, FileText, X, CheckCircle, AlertCircle,
  User, Hash, Layers, BookOpen, CloudUpload
} from 'lucide-react'
import { submitPresentation } from './actions'
import { formatFileSize } from '@/lib/utils'
import { useToast } from '@/components/providers/ToastProvider'
import type { AcademicSettings } from '@/types/database'

interface Section { id: string; name: string; department_id: string; dept_name?: string }
interface Subject { id: string; name: string; code: string; semester: number; department_id: string; dept_name?: string }

interface Props {
  sections: Section[]
  subjects: Subject[]
  settings: AcademicSettings | null
}

export default function UploadPageClient({ sections, subjects, settings }: Props) {
  const { success, error: showError } = useToast()

  const [studentName, setStudentName] = useState('')
  const [rollNumber,  setRollNumber]  = useState('')
  const [sectionId,   setSectionId]   = useState('')
  const [subjectId,   setSubjectId]   = useState('')
  const [file,        setFile]        = useState<File | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [submitted,   setSubmitted]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const academicYear = settings?.academic_year ?? '2024-25'
  const maxMb        = settings?.max_ppt_size_mb ?? 100

  // Filter subjects by selected section's department
  const selectedSection = sections.find((s) => s.id === sectionId)
  const filteredSubjects = selectedSection
    ? subjects.filter((s) => s.department_id === selectedSection.department_id)
    : subjects

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    if (f.size > maxMb * 1024 * 1024) {
      showError(`File exceeds the ${maxMb} MB limit.`)
      return
    }
    setFile(f)
  }, [maxMb, showError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxFiles: 1,
  })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!studentName.trim()) errs.student_name = 'Student name is required'
    const roll = parseInt(rollNumber)
    if (!rollNumber || isNaN(roll) || roll < 1 || roll > 200) errs.roll_number = 'Roll number must be 1–200'
    if (!sectionId) errs.section_id = 'Please select a section'
    if (!subjectId) errs.subject_id = 'Please select a subject'
    if (!file)      errs.file        = 'Please select a PowerPoint file'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setUploading(true)
    setProgress(10)

    try {
      const fd = new FormData()
      fd.append('student_name', studentName)
      fd.append('roll_number',  rollNumber)
      fd.append('section_id',   sectionId)
      fd.append('subject_id',   subjectId)
      fd.append('academic_year', academicYear)
      fd.append('file',         file!)

      setProgress(40)
      const result = await submitPresentation(fd)
      setProgress(100)

      if (result.success) {
        setSubmitted(true)
        success('Presentation submitted successfully!')
      } else {
        showError(result.error ?? 'Submission failed. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  if (submitted) {
    return (
      <div className="container" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="var(--accent-green)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Submission Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your presentation has been submitted for <strong style={{ color: 'var(--text-primary)' }}>{academicYear}</strong>.
          </p>
          <div className="card" style={{ padding: 16, marginBottom: 24, textAlign: 'left' }}>
            {[
              ['Student', studentName],
              ['Roll Number', rollNumber],
              ['File', file?.name],
              ['Academic Year', academicYear],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => { setSubmitted(false); setFile(null); setStudentName(''); setRollNumber(''); setSectionId(''); setSubjectId('') }}
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Submit your Presentation</h1>
        <p className="page-subtitle">Upload your PowerPoint presentation for the selected subject.</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '4px 12px', borderRadius: 99, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', fontSize: 12, fontWeight: 500 }}>
          Academic Year: {academicYear}
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">
                <User size={12} style={{ display: 'inline', marginRight: 4 }} />
                Student Name <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input type="text" className="input" placeholder="Enter your full name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              {fieldErrors.student_name && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{fieldErrors.student_name}</p>}
            </div>
            <div>
              <label className="label">
                <Hash size={12} style={{ display: 'inline', marginRight: 4 }} />
                Roll Number <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input type="number" className="input" placeholder="e.g. 12" min={1} max={200} value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
              {fieldErrors.roll_number && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{fieldErrors.roll_number}</p>}
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">
                <Layers size={12} style={{ display: 'inline', marginRight: 4 }} />
                Section <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <select className="input" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setSubjectId('') }}>
                <option value="">Select section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.dept_name ? `(${s.dept_name})` : ''}</option>
                ))}
              </select>
              {fieldErrors.section_id && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{fieldErrors.section_id}</p>}
            </div>
            <div>
              <label className="label">
                <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />
                Subject <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Select subject</option>
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              {fieldErrors.subject_id && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{fieldErrors.subject_id}</p>}
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="label">
              <UploadCloud size={12} style={{ display: 'inline', marginRight: 4 }} />
              PowerPoint File <span style={{ color: 'var(--accent-red)' }}>*</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>(.ppt / .pptx, max {maxMb} MB)</span>
            </label>

            {!file ? (
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <UploadCloud size={40} style={{ color: isDragActive ? '#6366f1' : 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your PowerPoint file'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>or</p>
                <span className="btn btn-secondary btn-sm">Browse Files</span>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Accepted: .ppt, .pptx</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={22} color="var(--accent-blue)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{formatFileSize(file.size)}</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--accent-red)', flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>
            )}
            {fieldErrors.file && <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>{fieldErrors.file}</p>}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button type="submit" className="btn btn-primary btn-lg" disabled={uploading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {uploading
              ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Submitting…</>
              : <><CloudUpload size={18} /> Submit Presentation</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
