import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProgramClient from './ProgramClient'

export default async function ProgramPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: programs } = await supabase
    .from('programs')
    .select('*, sessions(*, exercises(*, videos(*), comments(*)))')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const program = programs?.[0] ?? null

  if (!program) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 38, letterSpacing: 2, marginBottom: 24 }}>PROGRAM</h1>
        <div style={{ textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 2, marginBottom: 8 }}>NO PROGRAM LOADED</div>
          <p style={{ color: 'var(--grey)', marginBottom: 24 }}>Upload a CSV to populate your training program.</p>
          <Link href="/upload" className="btn btn-primary">Upload CSV →</Link>
        </div>
      </div>
    )
  }

  return <ProgramClient program={program} athleteId={user.id} />
}
