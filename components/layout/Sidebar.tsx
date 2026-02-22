'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import styles from './Sidebar.module.css'

const athleteNav = [
  { href: '/dashboard', icon: '◉', label: 'Dashboard' },
  { href: '/program',   icon: '▦', label: 'Program' },
  { href: '/upload',    icon: '↑', label: 'Upload CSV' },
  { href: '/progress',  icon: '↗', label: 'Progress' },
]

const coachNav = [
  { href: '/dashboard', icon: '◉', label: 'Dashboard' },
  { href: '/recap',     icon: '▶', label: 'Weekly Recap', badge: 'LIVE' },
  { href: '/roster',    icon: '◎', label: 'Athletes' },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = profile.role === 'coach' ? coachNav : athleteNav

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (profile.full_name ?? profile.email)
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoText}>LOADOUT</div>
        <div className={styles.logoSub}>TRAINING OS</div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navLabel}>{profile.role === 'coach' ? 'Coach' : 'Athlete'}</div>
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard') ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            {item.label}
            {'badge' in item && (item as any).badge && <span className={styles.badge}>{(item as any).badge}</span>}
          </Link>
        ))}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.athleteChip}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.info}>
            <div className={styles.name}>{profile.full_name ?? profile.email.split('@')[0]}</div>
            <div className={styles.meta}>
              {profile.weight_class ? `${profile.weight_class} · ` : ''}{profile.role}
            </div>
          </div>
        </div>
        <button className={styles.signOut} onClick={handleSignOut}>Sign out</button>
      </div>
    </aside>
  )
}
