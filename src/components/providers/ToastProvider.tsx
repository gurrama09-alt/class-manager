'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-4), { id, type, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast])
  const error   = useCallback((msg: string) => toast(msg, 'error'), [toast])
  const info    = useCallback((msg: string) => toast(msg, 'info'), [toast])

  const icons = {
    success: <CheckCircle size={16} style={{ color: 'var(--accent-green)' }} />,
    error:   <XCircle    size={16} style={{ color: 'var(--accent-red)' }} />,
    info:    <Info       size={16} style={{ color: 'var(--accent-blue)' }} />,
  }

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {icons[t.type]}
            <span style={{ flex: 1, fontSize: 14 }}>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
