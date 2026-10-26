'use client'

import React, { useState, useRef } from 'react'
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
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import type { AboutSpotlightData } from '@/lib/spotlight'

interface Props {
  initialData: AboutSpotlightData
  canEdit?: boolean
}

interface PhotoItem {
  id: string
  url: string
  file?: File
  isNew?: boolean
}

function getInitialPhotos(itemData: AboutSpotlightData): PhotoItem[] {
  const images = itemData.images && itemData.images.length > 0
    ? itemData.images
    : itemData.imageUrl
    ? [itemData.imageUrl]
    : []

  return images.map((url, idx) => ({
    id: `existing-${idx}-${url}`,
    url,
    isNew: false,
  }))
}

export default function AboutSpotlight({ initialData, canEdit = false }: Props) {
  const { success, error: showError } = useToast()
  const addFileInputRef = useRef<HTMLInputElement>(null)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)
  const replaceIndexRef = useRef<number | null>(null)

  const [data, setData] = useState<AboutSpotlightData>(initialData)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [photos, setPhotos] = useState<PhotoItem[]>(() => getInitialPhotos(initialData))
  const [description, setDescription] = useState<string>(initialData.description || '')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Carousel active index for viewing multiple photos
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0)

  // Sync state if initialData prop changes (React recommended pattern without effect)
  const [prevInitialData, setPrevInitialData] = useState<AboutSpotlightData>(initialData)
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData)
    setData(initialData)
    setPhotos(getInitialPhotos(initialData))
    setDescription(initialData.description || '')
    setActiveViewIndex(0)
  }

  // Get active images list for view mode
  const currentViewImages: string[] = data.images && data.images.length > 0
    ? data.images
    : data.imageUrl
    ? [data.imageUrl]
    : []

  // Ensure active index stays within bounds safely during render
  const safeViewIndex = Math.min(activeViewIndex, Math.max(0, currentViewImages.length - 1))

  // Process selected files for adding
  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const newItems: PhotoItem[] = []
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (!file.type.startsWith('image/') || !allowed.includes(file.type)) {
        showError(`File "${file.name}" is not a supported image format.`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        showError(`Image "${file.name}" exceeds the 10MB limit.`)
        continue
      }

      const objectUrl = URL.createObjectURL(file)
      newItems.push({
        id: `new-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        url: objectUrl,
        file,
        isNew: true,
      })
    }

    if (newItems.length > 0) {
      setPhotos((prev) => [...prev, ...newItems])
      success(
        newItems.length === 1
          ? 'Photo added to list.'
          : `${newItems.length} photos added to list.`
      )
    }

    if (addFileInputRef.current) {
      addFileInputRef.current.value = ''
    }
  }

  // Handle replacing an existing photo
  const handleReplaceFile = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const idx = replaceIndexRef.current
    if (idx === null || idx < 0) return

    const file = fileList[0]
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!file.type.startsWith('image/') || !allowed.includes(file.type)) {
      showError('Please select a valid image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Image must be less than 10MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPhotos((prev) => {
      const next = [...prev]
      next[idx] = {
        id: `replaced-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: objectUrl,
        file,
        isNew: true,
      }
      return next
    })

    replaceIndexRef.current = null
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = ''
    }
  }

  const triggerReplace = (idx: number) => {
    replaceIndexRef.current = idx
    replaceFileInputRef.current?.click()
  }

  // Remove a photo by index
  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  // Reorder photos
  const handleMovePhoto = (idx: number, direction: 'left' | 'right') => {
    setPhotos((prev) => {
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(idx, 1)
      next.splice(targetIdx, 0, moved)
      return next
    })
  }

  // Drag and Drop handlers
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
    if (e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files)
    }
  }

  // Cancel edits
  const handleCancel = () => {
    setPhotos(getInitialPhotos(data))
    setDescription(data.description || '')
    setIsEditing(false)
    if (addFileInputRef.current) addFileInputRef.current.value = ''
    if (replaceFileInputRef.current) replaceFileInputRef.current.value = ''
  }

  // Save changes
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('description', description)

      // Build manifest and gather new files
      const manifest: Array<{ type: 'existing'; url: string } | { type: 'new'; fileIndex: number }> = []
      let newFileCount = 0

      for (const item of photos) {
        if (item.file) {
          manifest.push({ type: 'new', fileIndex: newFileCount })
          formData.append('files', item.file)
          newFileCount++
        } else {
          manifest.push({ type: 'existing', url: item.url })
        }
      }

      formData.append('photoManifest', JSON.stringify(manifest))

      const res = await fetch('/api/about/spotlight', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update spotlight')
      }

      setData(result.data)
      setPhotos(getInitialPhotos(result.data))
      setDescription(result.data.description || '')
      setActiveViewIndex(0)
      setIsEditing(false)
      success('Spotlight updated successfully!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save changes.'
      showError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const hasPhotos = currentViewImages.length > 0
  const hasContent = Boolean(hasPhotos || data.description)

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
              {hasPhotos && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--accent-blue)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Camera size={11} /> {currentViewImages.length} {currentViewImages.length === 1 ? 'Photo' : 'Photos'}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              Featured announcement, faculty highlight, or campus updates
            </p>
          </div>
        </div>

        {/* Action Controls - Super Admin only */}
        {canEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  title="Edit photo(s) and description (Super Admin only)"
                >
                  <Pencil size={14} />
                  {hasContent ? 'Edit Spotlight' : 'Add Photos & Description'}
                </button>
                {hasPhotos && (
                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setTimeout(() => addFileInputRef.current?.click(), 100)
                    }}
                    className="btn btn-primary btn-sm"
                    style={{
                      fontSize: 13,
                      padding: '6px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--gradient-brand)',
                      color: 'white',
                      border: 'none',
                    }}
                    title="Add another photo to the spotlight"
                  >
                    <Plus size={14} />
                    Add Another Photo
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Option to Add Another Photo inside Edit bar */}
                <button
                  type="button"
                  onClick={() => addFileInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: 13,
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: 'var(--accent-blue)',
                  }}
                  title="Upload additional photos"
                >
                  <Plus size={14} /> Add Another Photo
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 13, padding: '6px 12px' }}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  type="button"
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
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={addFileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: 'none' }}
        onChange={(e) => handleAddFiles(e.target.files)}
      />

      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: 'none' }}
        onChange={(e) => handleReplaceFile(e.target.files)}
      />

      {/* ── PHOTO AREA ── */}
      <div style={{ marginBottom: 20 }}>
        {isEditing ? (
          /* ============================================================ */
          /* EDIT MODE: PHOTO MANAGEMENT (Cards list + Add Another Photo) */
          /* ============================================================ */
          <div>
            {photos.length > 0 ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Photos ({photos.length}) — Photo 1 is the main/cover photo
                  </span>
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--accent-blue)',
                    }}
                  >
                    <Plus size={13} /> Add Another Photo
                  </button>
                </div>

                {/* Grid / List of current photos */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: photos.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  {photos.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        position: 'relative',
                        borderRadius: 12,
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: idx === 0 ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Photo preview container */}
                      <div
                        style={{
                          position: 'relative',
                          height: photos.length === 1 ? 320 : 180,
                          background: 'rgba(0,0,0,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={`Spotlight photo ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />

                        {/* Badge for Photo Index */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            background: idx === 0 ? 'var(--gradient-brand)' : 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(4px)',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                          }}
                        >
                          <Camera size={11} />
                          {idx === 0 ? 'Photo 1 (Cover)' : `Photo ${idx + 1}`}
                        </div>

                        {/* Top-Right Quick Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="btn btn-danger btn-sm"
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            padding: '5px 7px',
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                          title="Remove this photo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Photo Actions Footer */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderTop: '1px solid var(--border)',
                          gap: 6,
                        }}
                      >
                        {/* Replace button */}
                        <button
                          type="button"
                          onClick={() => triggerReplace(idx)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Replace with another file"
                        >
                          <RefreshCw size={11} /> Replace
                        </button>

                        {/* Reorder Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(idx, 'left')}
                            disabled={idx === 0}
                            className="btn btn-ghost btn-sm"
                            style={{
                              padding: '4px 6px',
                              opacity: idx === 0 ? 0.3 : 1,
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            }}
                            title="Move photo earlier"
                          >
                            <ArrowLeft size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(idx, 'right')}
                            disabled={idx === photos.length - 1}
                            className="btn btn-ghost btn-sm"
                            style={{
                              padding: '4px 6px',
                              opacity: idx === photos.length - 1 ? 0.3 : 1,
                              cursor: idx === photos.length - 1 ? 'not-allowed' : 'pointer',
                            }}
                            title="Move photo later"
                          >
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Option to Add Another Photo - Drag & Drop Box below */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => addFileInputRef.current?.click()}
                  style={{
                    borderRadius: 12,
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: isDragging
                      ? '2px dashed var(--accent-blue)'
                      : '2px dashed rgba(99, 102, 241, 0.35)',
                    background: isDragging
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(99, 102, 241, 0.04)',
                    transition: 'all 200ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(99, 102, 241, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={20} color="var(--accent-blue)" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      + Add Another Photo
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Click to choose or drag & drop additional image files (PNG, JPG, WebP up to 10MB)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* When 0 photos exist in edit mode */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => addFileInputRef.current?.click()}
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
                  Click or drag & drop to upload photos
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginBottom: 12 }}>
                  Supports PNG, JPG, JPEG, WebP, GIF (up to 10MB each). You can select multiple files!
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    pointerEvents: 'none',
                  }}
                >
                  <Plus size={14} /> Add Photo(s)
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* VIEW MODE: SINGLE PHOTO OR MULTI-PHOTO INTERACTIVE GALLERY   */
          /* ============================================================ */
          currentViewImages.length > 0 ? (
            <div>
              {/* Featured Active Image Container */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 14,
                  overflow: 'hidden',
                  maxHeight: 460,
                  minHeight: 260,
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentViewImages[safeViewIndex] || currentViewImages[0]}
                  alt={`About Spotlight ${safeViewIndex + 1}`}
                  style={{
                    width: '100%',
                    maxHeight: 460,
                    objectFit: 'contain',
                    borderRadius: 14,
                    display: 'block',
                    transition: 'opacity 250ms ease',
                  }}
                />

                {/* Multi-Photo Overlays (Only if > 1 photo) */}
                {currentViewImages.length > 1 && (
                  <>
                    {/* Photo Counter Pill (Top-Right) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        background: 'rgba(0, 0, 0, 0.72)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        zIndex: 2,
                      }}
                    >
                      <Camera size={13} />
                      {safeViewIndex + 1} / {currentViewImages.length}
                    </div>

                    {/* Previous Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveViewIndex((prev) =>
                          prev === 0 ? currentViewImages.length - 1 : prev - 1
                        )
                      }
                      aria-label="Previous photo"
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 180ms ease',
                        zIndex: 2,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.85)'
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.65)'
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                      }}
                    >
                      <ChevronLeft size={22} />
                    </button>

                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveViewIndex((prev) =>
                          prev === currentViewImages.length - 1 ? 0 : prev + 1
                        )
                      }
                      aria-label="Next photo"
                      style={{
                        position: 'absolute',
                        right: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 180ms ease',
                        zIndex: 2,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.85)'
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.65)'
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                      }}
                    >
                      <ChevronRight size={22} />
                    </button>

                    {/* Bottom Dot Indicators */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 6,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(6px)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        zIndex: 2,
                      }}
                    >
                      {currentViewImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveViewIndex(idx)}
                          aria-label={`Go to photo ${idx + 1}`}
                          style={{
                            width: idx === safeViewIndex ? 18 : 7,
                            height: 7,
                            borderRadius: 4,
                            background: idx === safeViewIndex ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.4)',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Strip Row (When > 1 photo) */}
              {currentViewImages.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 12,
                    overflowX: 'auto',
                    paddingBottom: 4,
                  }}
                >
                  {currentViewImages.map((url, idx) => {
                    const isActive = idx === safeViewIndex
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveViewIndex(idx)}
                        style={{
                          position: 'relative',
                          width: 72,
                          height: 52,
                          flexShrink: 0,
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: isActive
                            ? '2px solid var(--accent-blue)'
                            : '1px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(0, 0, 0, 0.5)',
                          padding: 0,
                          cursor: 'pointer',
                          opacity: isActive ? 1 : 0.65,
                          transform: isActive ? 'scale(1.04)' : 'scale(1)',
                          transition: 'all 180ms ease',
                          boxShadow: isActive ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Thumbnail ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      </button>
                    )
                  })}
                </div>
              )}
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
                No photo uploaded yet.{canEdit ? ' Click "Add Photos & Description" above to upload photos.' : ''}
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
                Description (visible below the photos)
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
              placeholder="Add a detailed description, announcement, or explanation for this spotlight..."
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
              {description ||
                (canEdit
                  ? 'No description added yet. Click "Edit Spotlight" above to add one.'
                  : 'No description added yet.')}
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
