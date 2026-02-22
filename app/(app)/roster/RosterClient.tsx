'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './roster.module.css'

export default function RosterClient({ coachId, athletes: initial }: { coachId: string; athletes: any[] }) {
  const [athletes, setAthletes] = useState(initial)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const addAthlete = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    // Look up athlete by email
    const { data: found } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', inviteEmail.trim().toLowerCase())
      .eq('role', 'athlete')
      .single()

    if (!found) {
      setError('No athlete account found with that email. Make sure they have signed up first.')
      setInviting(false)
      return
    }

    const { error: linkErr } = await supabase
      .from('coach_athlete')
      .insert({ coach_id: coachId, athlete_id: found.id })

    if (linkErr) {
      setError(linkErr.code === '23505' ? 'This athlete is already on your roster.' : linkErr.message)
      setInviting(false)
      return
    }

    setAthletes(prev => [{ athlete: found, created_at: new Date().toISOString() }, ...prev])
    setInviteEmail('')
    setSuccess(`${found.full_name ?? found.email} added to your roster.`)
    setInviting(false)
  }

  const removeAthlete = async (athleteId: string) => {
    if (!confirm('Remove this athlete from your roster?')) return
    const supabase = createClient()
    await supabase.from('coach_athlete').delete().eq('coach_id', coachId).eq('athlete_id', athleteId)
    setAthletes(prev => prev.filter(r => r.athlete.id !== athleteId))
  }

  const getInitials = (name: string | null, email: string) =>
    (name ?? email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>ATHLETES</h1>
          <p className={styles.sub}>{athletes.length} athlete{athletes.length !== 1 ? 's' : ''} on your roster</p>
        </div>
      </div>

      {/* Add athlete */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className={styles.cardTitle}>Add Athlete by Email</div>
        <p className={styles.addNote}>The athlete must have already created an account at this app with the role "Athlete".</p>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.successMsg}>{success}</div>}
        <div className={styles.addRow}>
          <input
            className={styles.emailInput}
            type="email"
            placeholder="athlete@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addAthlete() }}
          />
          <button className="btn btn-primary" onClick={addAthlete} disabled={inviting || !inviteEmail.trim()}>
            {inviting ? 'Adding…' : '+ Add Athlete'}
          </button>
        </div>
      </div>

      {/* Roster */}
      {athletes.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◎</div>
          <div className={styles.emptyTitle}>NO ATHLETES YET</div>
          <p>Add your first athlete above.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {athletes.map((rel: any) => {
            const a = rel.athlete
            return (
              <div key={a.id} className={styles.athleteRow}>
                <div className={styles.avatar}>
                  {getInitials(a.full_name, a.email)}
                </div>
                <div className={styles.info}>
                  <div className={styles.name}>{a.full_name ?? a.email.split('@')[0]}</div>
                  <div className={styles.meta}>{a.email} {a.weight_class ? `· ${a.weight_class}` : ''}</div>
                </div>
                <div className={styles.rowActions}>
                  <Link href={`/recap?athlete_id=${a.id}`} className="btn btn-primary btn-sm">▶ View Recap</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeAthlete(a.id)}>Remove</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
