import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecapClient from './RecapClient'
import styles from './recap.module.css'

export default async function RecapPage({
  searchParams,
}: {
  searchParams: { athlete_id?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Determine which athlete to review
  let athleteId = searchParams.athlete_id
  if (!athleteId && profile?.role === 'coach') {
    // Get first athlete
    const { data: ca } = await supabase
      .from('coach_athlete')
      .select('athlete_id')
      .eq('coach_id', user.id)
      .limit(1)
      .single()
    athleteId = ca?.athlete_id
  }
  if (!athleteId) athleteId = user.id // athlete views own clips

  // Fetch athlete profile
  const { data: athleteProfile } = await supabase.from('profiles').select('*').eq('id', athleteId).single()

  // Get latest program
  const { data: programs } = await supabase
    .from('programs')
    .select('id')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(1)

  const programId = programs?.[0]?.id

  // Get exercises with videos
  const { data: exercises } = programId
    ? await supabase
        .from('exercises')
        .select('*, sessions!inner(day_label, program_id), videos(*), comments(*)')
        .eq('sessions.program_id', programId)
        .eq('athlete_id', athleteId)
        .order('created_at')
    : { data: [] }

  // Flatten: one clip per video
  const clips: any[] = []
  for (const ex of (exercises ?? [])) {
    for (const vid of (ex.videos ?? [])) {
      clips.push({ exercise: { ...ex, session: ex.sessions }, video: vid })
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>WEEKLY RECAP</h1>
          <p className={styles.sub}>
            {profile?.role === 'coach' ? `Coach view · ${athleteProfile?.full_name ?? 'Athlete'}` : 'Your week in review'} · {clips.length} clips
          </p>
        </div>
      </div>
      <RecapClient clips={clips} coachId={user.id} profile={athleteProfile} />
    </div>
  )
}
