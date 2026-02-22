import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './progress.module.css'

export default async function ProgressPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all programs with exercises that have actuals
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*, sessions!inner(day_label, programs!inner(name, week_number, created_at))')
    .eq('athlete_id', user.id)
    .not('actual_load', 'is', null)
    .order('created_at')

  // Group by exercise name for charting
  const byExercise: Record<string, { week: number; load: number; date: string }[]> = {}
  for (const ex of (exercises ?? [])) {
    if (!ex.actual_load) continue
    const name = ex.name
    if (!byExercise[name]) byExercise[name] = []
    byExercise[name].push({
      week: ex.sessions?.programs?.week_number ?? 1,
      load: ex.actual_load,
      date: ex.created_at,
    })
  }

  const topLifts = Object.entries(byExercise)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>PROGRESS</h1>
        <p className={styles.sub}>Actual loads logged over time</p>
      </div>

      {topLifts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>↗</div>
          <div className={styles.emptyTitle}>NO DATA YET</div>
          <p>Log actual loads in your program to track progress.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {topLifts.map(([name, entries]) => {
            const maxLoad = Math.max(...entries.map(e => e.load))
            const minLoad = Math.min(...entries.map(e => e.load))
            const latest = entries[entries.length - 1]?.load ?? 0
            const first = entries[0]?.load ?? 0
            const gain = latest - first

            return (
              <div key={name} className={styles.chartCard}>
                <div className={styles.chartTitle}>{name}</div>
                <div className={styles.chartMain}>
                  {latest}kg
                  {gain !== 0 && (
                    <span className={`${styles.gain} ${gain > 0 ? styles.gainPos : styles.gainNeg}`}>
                      {gain > 0 ? '+' : ''}{gain}kg
                    </span>
                  )}
                </div>

                {/* Simple bar chart */}
                <div className={styles.bars}>
                  {entries.map((e, i) => {
                    const height = maxLoad === minLoad ? 100 : ((e.load - minLoad) / (maxLoad - minLoad)) * 100
                    return (
                      <div key={i} className={styles.barWrap} title={`${e.load}kg · W${e.week}`}>
                        <div
                          className={`${styles.bar} ${i === entries.length - 1 ? styles.barCurrent : ''}`}
                          style={{ height: `${Math.max(height, 8)}%` }}
                        />
                        <div className={styles.barLabel}>W{e.week}</div>
                      </div>
                    )
                  })}
                </div>

                <div className={styles.chartMeta}>
                  {entries.length} sessions logged · max {maxLoad}kg
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
