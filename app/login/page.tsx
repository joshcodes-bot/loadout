'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './auth.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <div className={styles.logo}>LOADOUT</div>
          <div className={styles.tagline}>TRAINING OS</div>
        </div>
        <div className={styles.heroText}>
          <div className={styles.heroLine}>UPLOAD.</div>
          <div className={styles.heroLine}>FILM.</div>
          <div className={styles.heroLine} style={{ color: 'var(--red)' }}>REVIEW.</div>
        </div>
        <p className={styles.heroSub}>The platform for serious powerlifters and their coaches.</p>
      </div>

      <div className={styles.right}>
        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.formTitle}>SIGN IN</div>
          <div className={styles.formSub}>Welcome back, athlete.</div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button className={`btn btn-primary ${styles.submitBtn}`} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>

          <div className={styles.switch}>
            No account? <Link href="/signup">Create one</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
