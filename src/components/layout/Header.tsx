'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  UploadCloud, BookOpen, LayoutDashboard, Info, Mail,
  Sun, Moon, Settings, Menu, X, GraduationCap, LogOut, User
} from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/database'

const navLinks = [
  { href: '/upload',    label: 'Upload',    icon: UploadCloud },
  { href: '/resources', label: 'Resources', icon: BookOpen },
  { href: '/admin',     label: 'Admin',     icon: LayoutDashboard, adminOnly: true },
  { href: '/about',     label: 'About',     icon: Info },
  { href: '/contact',   label: 'Contact',   icon: Mail },
]

export default function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchProfile = async (authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (data) {
          setUser(data)
        } else {
          setUser({
            id: authUser.id,
            email: authUser.email ?? '',
            full_name: (authUser.user_metadata?.full_name as string) ?? authUser.email?.split('@')[0] ?? 'User',
            role: 'student',
            department_id: null,
            is_active: true,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      } catch {
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          full_name: (authUser.user_metadata?.full_name as string) ?? authUser.email?.split('@')[0] ?? 'User',
          role: 'student',
          department_id: null,
          is_active: true,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } finally {
        setLoading(false)
      }
    }

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }
      fetchProfile(authUser)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      fetchProfile(session.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
    router.refresh()
  }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'department_admin'

  const visibleLinks = navLinks.filter((l) => {
    if (l.adminOnly && !isAdmin) return false
    return true
  })

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--gradient-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              CLASS <span className="gradient-text">MANAGEMENT</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
            {visibleLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${pathname?.startsWith(href) ? 'active' : ''}`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="btn btn-ghost btn-sm"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ padding: '8px' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {!loading && user && (
              <>
                <Link href="/settings" className="btn btn-ghost btn-sm" style={{ padding: '8px' }} title="Settings">
                  <Settings size={16} />
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--gradient-brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white',
                  }}>
                    {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                  </div>
                  <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Logout" style={{ padding: '8px' }}>
                    <LogOut size={16} />
                  </button>
                </div>
              </>
            )}

            {!loading && !user && (
              <Link href="/login" className="btn btn-primary btn-sm">
                <User size={14} /> Sign In
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="btn btn-ghost btn-sm mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ padding: '8px' }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {visibleLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${pathname?.startsWith(href) ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleLogout}
                className="nav-link"
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent-red)', textAlign: 'left' }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            )}
          </div>
        )}
      </header>

      <style>{`
        .desktop-nav { display: flex; }
        .mobile-menu-btn { display: none; }
        @media (max-width: 768px) {
          .desktop-nav { display: none; }
          .mobile-menu-btn { display: flex; }
        }
      `}</style>
    </>
  )
}
