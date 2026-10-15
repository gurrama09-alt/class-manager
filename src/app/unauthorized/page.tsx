import { ShieldAlert, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <ShieldAlert size={36} color="var(--accent-red)" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Access Denied</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          You don&apos;t have permission to view this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <Link href="/upload" className="btn btn-primary">
          <ArrowLeft size={15} /> Go Back Home
        </Link>
      </div>
    </div>
  )
}
