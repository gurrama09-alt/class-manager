'use client'

import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  confirmText?: string
  cancelText?: string
}

export default function ConfirmDialog({ open, title, description, onConfirm, onCancel, danger, confirmText = 'Confirm', cancelText = 'Cancel' }: Props) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 420, padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: danger ? 'var(--accent-red-dim)' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} color={danger ? 'var(--accent-red)' : 'var(--text-secondary)'} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>{cancelText}</button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
