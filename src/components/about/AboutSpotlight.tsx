'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  UploadCloud,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  Loader2,
  RefreshCw,
  Camera
} from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import type { AboutSpotlightData } from '@/lib/spotlight'

interface Props {
  initialData: AboutSpotlightData
  isAdmin?: boolean
}

export default function AboutSpotlight({ initialData, isAdmin = true }: Props) {
  const { success, error: showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<AboutSpotlightData>(initialData)
  // If there's neither photo nor description, open in edit mode by default for quick setup
  const [isEditing, setIsEditing] = useState<boolean>(!initialData.imageUrl && !initialData.description)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData.imageUrl)
  const [description, setDescription] = useState<string>(initialData.description || '')
  const [removeImage, setRemoveImage] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Sync state if initialData changes
  useEffect(() => {
    setData(initialData)
    setPreviewUrl(initialData.imageUrl)
    setDescription(initialData.description || '')
  }, [initialData])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Image must be less than 10MB.')
      return
    }

    setSelectedFile(file)
    setRemoveImage(false)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Please drop an image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Image must be less than 10MB.')
      return
    }

    setSelectedFile(file)
    setRemoveImage(false)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle Remove Image
  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoveImage(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Cancel edits
  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(data.imageUrl)
    setDescription(data.description || '')
    setRemoveImage(false)
    setIsEditing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Save changes
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('description', description)
      formData.append('removeImage', removeImage ? 'true' : 'false')
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const res = await fetch('/api/about/spotlight', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update spotlight')
      }

      setData(result.data)
      setPreviewUrl(result.data.imageUrl)
      setDescription(result.data.description)
      setSelectedFile(null)
      setRemoveImage(false)
      setIsEditing(false)
      success('Spotlight updated successfully!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save changes.'
      showError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const hasContent = Boolean(data.imageUrl || data.description)

  return (
    <div
      className="card"
      style={{
        borderRadius: 20,
        marginBottom: 36,
        padding: '24px',
        background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(20, 20, 32, 0.95) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient accent */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Sparkles size={18} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                Campus Spotlight
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'rgba(34, 197, 94, 0.14)',
                  color: 'var(--accent-green)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                }}
              >
                <Eye size={11} /> Visible to all users
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              Featured announcement, faculty highlight, or campus update
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: 13,
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Edit photo and description"
            >
              <Pencil size={14} />
              {hasContent ? 'Edit Spotlight' : 'Add Photo & Description'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 13, padding: '6px 12px' }}
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary btn-sm"
                style={{
                  fontSize: 13,
                  padding: '6px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--gradient-brand)',
                  color: 'white',
                  border: 'none',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── PHOTO AREA ── */}
      <div style={{ marginBottom: 20 }}>
        {isEditing ? (
          /* Edit Mode Photo Uploader / Preview */
          previewUrl ? (
            <div
              style={{
                position: 'relative',
                borderRadius: 14,
                overflow: 'hidden',
                maxHeight: 460,
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-focus)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Spotlight preview"
                style={{
                  width: '100%',
                  maxHeight: 460,
                  objectFit: 'contain',
                  borderRadius: 14,
                  display: 'block',
                }}
              />

              {/* Floating Overlay Controls on Photo */}
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  display: 'flex',
                  gap: 8,
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: 'none',
                  }}
                  title="Upload a different photo"
                >
                  <Camera size={14} /> Change Photo
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="btn btn-danger btn-sm"
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                  }}
                  title="Remove this photo"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ) : (
            /* Drag and Drop Upload Area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                borderRadius: 14,
                padding: '44px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                border: isDragging
                  ? '2px dashed var(--accent-blue)'
                  : '2px dashed rgba(255, 255, 255, 0.15)',
                background: isDragging
                  ? 'rgba(59, 130, 246, 0.08)'
                  : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 200ms ease',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <UploadCloud size={28} color="var(--accent-blue)" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                Click or drag & drop to upload a photo
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Supports PNG, JPG, JPEG, WebP, GIF (up to 10MB)
              </p>
            </div>
          )
        ) : (
          /* View Mode Photo Display */
          data.imageUrl ? (
            <div
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                maxHeight: 460,
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.imageUrl}
                alt="About Spotlight"
                style={{
                  width: '100%',
                  maxHeight: 460,
                  objectFit: 'contain',
                  borderRadius: 14,
                  display: 'block',
                }}
              />
            </div>
          ) : (
            /* Placeholder when no image is yet uploaded */
            <div
              style={{
                borderRadius: 14,
                padding: '36px 20px',
                textAlign: 'center',
                border: '1px dashed var(--border)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <ImageIcon size={24} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                No photo uploaded yet. Click <strong>Edit Spotlight</strong> to upload one.
              </p>
            </div>
          )
        )}
      </div>

      {/* ── DESCRIPTION FIELD BELOW PHOTO ── */}
      <div>
        {isEditing ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Description (visible below the photo)
              </label>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {description.length} characters
              </span>
            </div>
            <textarea
              className="input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a detailed description, announcement, or explanation for this photo..."
              style={{
                resize: 'vertical',
                minHeight: 100,
                lineHeight: 1.6,
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'var(--gradient-brand)',
                  color: 'white',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Save Spotlight
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 12,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: description ? 'var(--text-primary)' : 'var(--text-muted)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                fontStyle: description ? 'normal' : 'italic',
              }}
            >
              {description || 'No description added yet. Click "Edit Spotlight" above to add one.'}
            </div>

            {data.updatedAt && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={12} />
                Last updated:{' '}
                {new Date(data.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
