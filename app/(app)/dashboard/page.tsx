import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Fetch latest program
  const { data: programs } = await supabase
    .from('programs')
    .select('*, sessions(*, exercises(*, videos(*)))')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const program = programs?.[0]
  const sessions = program?.sessions ?? []
  const totalExercises = sessions.flatMap((s: any) => s.exercises ?? [])
  const totalVideos = totalExercises.flatMap((e: any) => e.videos ?? [])

  // Coach: fetch athletes
  let athletes: any[] = []
  if (profile?.role === 'coach') {
    const { data } = await supabase
      .from('coach_athlete')
      .select('athlete_id, profiles!coach_athlete_athlete_id_fkey(*)')
      .eq('coach_id', user.id)
    athletes = data ?? []
  }

  // Recent comments for athletes
  const { data: recentComments } = await supabase
    .from('comments')
    .select('*, coach:profiles!comments_coach_id_fkey(full_name)')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>DASHBOARD</h1>
          <p className={styles.sub}>
            {profile?.role === 'coach'
              ? `Coach view · ${athletes.length} athlete${athletes.length !== 1 ? 's' : ''}`
              : `${program ? program.name : 'No program yet'} · Week ${program?.week_number ?? 1}`}
          </p>
        </div>
        <div className={styles.actions}>
          {profile?.role === 'athlete' && (
            <>
              <Link href="/upload" className="btn btn-ghost">Upload CSV</Link>
              <Link href="/program" className="btn btn-primary">View Program →</Link>
            </>
          )}
          {profile?.role === 'coach' && (
            <Link href="/recap" className="btn btn-primary">▶ Weekly Recap</Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {profile?.role === 'athlete' ? (
          <>
            <StatCard label="Sessions" value={sessions.length.toString()} sub="this program" />
            <StatCard label="Exercises" value={totalExercises.length.toString()} sub="logged" />
            <StatCard label="Videos" value={totalVideos.length.toString()} sub="attached" />
            <StatCard label="Coach Notes" value={(recentComments?.length ?? 0).toString()} sub="received" />
          </>
        ) : (
          <>
            <StatCard label="Athletes" value={athletes.length.toString()} sub="on roster" />
            <StatCard label="Awaiting Review" value="0" sub="clips this week" />
          </>
        )}
      </div>

      {/* Recent coach feedback */}
      {profile?.role === 'athlete' && recentComments && recentComments.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className={styles.cardTitle}>Recent Coach Feedback</div>
          {recentComments.map((c: any) => (
            <div key={c.id} className={styles.feedbackItem}>
              <div className={styles.feedbackMeta}>
                {c.coach?.full_name ?? 'Coach'} · {new Date(c.created_at).toLocaleDateString()}
              </div>
              <div className={styles.feedbackBody}>{c.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {profile?.role === 'athlete' && !program && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <div className={styles.emptyTitle}>NO PROGRAM YET</div>
          <p className={styles.emptySub}>Upload a CSV to get started.</p>
          <Link href="/upload" className="btn btn-primary" style={{ marginTop: 20 }}>Upload CSV →</Link>
        </div>
      )}

      {/* Coach: athlete list */}
      {profile?.role === 'coach' && athletes.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>◎</div>
          <div className={styles.emptyTitle}>NO ATHLETES YET</div>
          <p className={styles.emptySub}>Go to the Athletes page to add your first athlete by email.</p>
          <Link href="/roster" className="btn btn-primary" style={{ marginTop: 20 }}>Manage Roster →</Link>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  )
}
