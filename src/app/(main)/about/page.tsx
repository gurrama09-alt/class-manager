import type { Metadata } from 'next'
import { GraduationCap, Presentation, BookOpen, Shield } from 'lucide-react'

export const metadata: Metadata = { title: 'About' }

const features = [
  {
    icon: Presentation,
    color: 'var(--accent-blue)',
    bg: 'var(--accent-blue-dim)',
    title: 'PPT Collection',
    desc: 'Students upload their PowerPoint presentations directly through the platform. Admins can track, download, and manage all submissions by subject with ZIP export support.',
  },
  {
    icon: BookOpen,
    color: 'var(--accent-green)',
    bg: 'var(--accent-green-dim)',
    title: 'Study Resources',
    desc: 'Centralized library of Question Banks, Lab Manuals, Assignments, and Syllabi. Resources are organized by department, subject, and semester for quick access.',
  },
  {
    icon: Shield,
    color: 'var(--accent-purple)',
    bg: 'var(--accent-purple-dim)',
    title: 'Admin Control',
    desc: 'Role-based access control with Super Admin and Department Admin roles. Manage academic structure, invite administrators, and audit every action on the platform.',
  },
]

export default function AboutPage() {
  return (
    <div className="container" style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '48px 0 40px' }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <GraduationCap size={36} color="white" />
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.03em' }}>
          About <span className="gradient-text">CLASS MANAGEMENT</span>
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
          CLASS MANAGEMENT is an academic platform designed to centralize student presentation submissions and study resource distribution — making academic management effortless for both students and administrators.
        </p>
      </div>

      {/* Feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
        {features.map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className="card" style={{ padding: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon size={24} color={color} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>{title}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Mission */}
      <div className="card" style={{ padding: 36, textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)' }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>Our Mission</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8, maxWidth: 600, margin: '0 auto' }}>
          To streamline academic workflows by providing a secure, organized, and intuitive platform where students can submit work and administrators can manage resources — eliminating manual processes and reducing administrative overhead.
        </p>
      </div>
    </div>
  )
}
