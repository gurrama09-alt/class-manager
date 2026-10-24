'use client'

import React, { useState, useMemo } from 'react'
import { Search, ScrollText, X } from 'lucide-react'
import { formatDateTime, actionLabel } from '@/lib/utils'
import type { AuditLog } from '@/types/database'

const ACTION_COLORS: Record<string, string> = {
  resource_upload:        'badge-green',
  resource_edit:          'badge-blue',
  resource_delete:        'badge-red',
  resource_download:      'badge-gray',
  presentation_submit:    'badge-green',
  presentation_replace:   'badge-amber',
  presentation_delete:    'badge-red',
  presentation_download:  'badge-gray',
  structure_create:       'badge-purple',
  structure_edit:         'badge-blue',
  structure_delete:       'badge-red',
  admin_invite:           'badge-amber',
  admin_activate:         'badge-green',
  admin_deactivate:       'badge-red',
  admin_remove:           'badge-red',
  settings_update:        'badge-blue',
  login:                  'badge-gray',
  logout:                 'badge-gray',
}

interface Props {
  logs: AuditLog[]
  departments: { id: string; name: string }[]
}

const PAGE_SIZE = 25

export default function AuditLogClient({ logs, departments }: Props) {
  const [search, setSearch]       = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterDept, setFilterDept]   = useState('')
  const [page, setPage]           = useState(1)

  const filtered = useMemo(() => {
    let list = logs
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((l) =>
        l.actor_email?.toLowerCase().includes(q) ||
        l.entity_name?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      )
    }
    if (filterAction) list = list.filter((l) => l.action === filterAction)
    if (filterDept)   list = list.filter((l) => l.department_id === filterDept)
    return list
  }, [logs, search, filterAction, filterDept])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const uniqueActions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs])

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ScrollText size={22} color="var(--accent-amber)" />
          <h1 className="page-title" style={{ margin: 0 }}>Audit Log</h1>
        </div>
        <p className="page-subtitle">Track administrative resource actions.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search by email, entity, or description…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 180 }} value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}>
          <option value="">All Actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 160 }} value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1) }}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {(search || filterAction || filterDept) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterAction(''); setFilterDept(''); setPage(1) }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Summary */}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Showing {paged.length} of {filtered.length} entries
      </p>

      {paged.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <ScrollText size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 600 }}>No log entries found</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Department</th>
                <th>Description</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className={`badge ${ACTION_COLORS[log.action] ?? 'badge-gray'}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.actor_email ?? '—'}</td>
                  <td style={{ fontSize: 13 }}>
                    {log.entity_name && (
                      <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.entity_name}
                      </div>
                    )}
                    {log.entity_type && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.entity_type}</div>}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {(log as unknown as { departments?: { name: string } | null }).departments?.name ?? '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 220 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {log.description ?? '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
