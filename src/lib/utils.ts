// ─────────────────────────────────────────────────────────────────────────────
// Shared utility functions
// ─────────────────────────────────────────────────────────────────────────────

/** Format bytes into human-readable file size */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** Format ISO timestamp to human-readable */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Sanitize a filename for safe storage */
export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200)
}

/** Generate a unique storage path */
export function generateStoragePath(
  bucket: 'presentations' | 'resources',
  folder: string,
  filename: string
): string {
  const ts = Date.now()
  const safe = sanitizeFilename(filename)
  return `${folder}/${ts}_${safe}`
}

/** Map category slug to display label */
export function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    question_bank: 'Question Bank',
    lab_manual: 'Lab Manual',
    assignments: 'Assignments',
    syllabus: 'Syllabus',
  }
  return map[cat] ?? cat
}

/** Map audit action to display label */
export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    resource_upload: 'Resource Uploaded',
    resource_edit: 'Resource Edited',
    resource_delete: 'Resource Deleted',
    resource_download: 'Resource Downloaded',
    presentation_submit: 'Presentation Submitted',
    presentation_replace: 'Presentation Replaced',
    presentation_delete: 'Presentation Deleted',
    presentation_download: 'Presentation Downloaded',
    structure_create: 'Structure Created',
    structure_edit: 'Structure Edited',
    structure_delete: 'Structure Deleted',
    admin_invite: 'Admin Invited',
    admin_activate: 'Admin Activated',
    admin_deactivate: 'Admin Deactivated',
    admin_remove: 'Admin Removed',
    settings_update: 'Settings Updated',
    login: 'Login',
    logout: 'Logout',
  }
  return map[action] ?? action
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

/** Debounce function */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/** Translate auth errors into clear, friendly user-facing messages */
export function getAuthErrorMessage(err: unknown): string {
  const msg =
    typeof err === 'string'
      ? err
      : (err as { message?: string })?.message || ''

  if (!msg) return 'An unexpected error occurred. Please try again.'

  const lower = msg.toLowerCase()
  if (lower.includes('failed to fetch')) {
    return 'Unable to reach the server. Please check your internet connection, disable ad-blockers / shields, or restart your dev server.'
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password. Please verify your credentials and try again.'
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Please sign in instead.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address is not verified yet. Please check your inbox for the confirmation email.'
  }
  return msg
}
