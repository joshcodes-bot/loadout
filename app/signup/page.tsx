'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from '../login/auth.module.css'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'athlete' | 'coach'>('athlete')
  const [weightClass, setWeightClass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, weight_class: weightClass },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
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
          <div className={styles.heroLine}>JOIN.</div>
          <div className={styles.heroLine}>TRAIN.</div>
          <div className={styles.heroLine} style={{ color: 'var(--red)' }}>IMPROVE.</div>
        </div>
        <p className={styles.heroSub}>Create your account and start logging your training today.</p>
      </div>

      <div className={styles.right}>
        <form className={styles.form} onSubmit={handleSignup}>
          <div className={styles.formTitle}>CREATE ACCOUNT</div>
          <div className={styles.formSub}>Let's get you set up.</div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>I am a</label>
            <div className={styles.roleRow}>
              {(['athlete', 'coach'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.roleBtn} ${role === r ? styles.active : ''}`}
                  onClick={() => setRole(r)}
                >
                  <span className={styles.roleIcon}>{r === 'athlete' ? '🏋️' : '📋'}</span>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input className={styles.input} type="text" placeholder="Jake Donovan" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input className={styles.input} type="password" placeholder="min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>

          {role === 'athlete' && (
            <div className={styles.field}>
              <label className={styles.label}>Weight Class (optional)</label>
              <input className={styles.input} type="text" placeholder="e.g. 93kg" value={weightClass} onChange={e => setWeightClass(e.target.value)} />
            </div>
          )}

          <button className={`btn btn-primary ${styles.submitBtn}`} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>

          <div className={styles.switch}>
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
