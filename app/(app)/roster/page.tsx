import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RosterClient from './RosterClient'

export default async function RosterPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  const { data: relationships } = await supabase
    .from('coach_athlete')
    .select('*, athlete:profiles!coach_athlete_athlete_id_fkey(*)')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  return <RosterClient coachId={user.id} athletes={relationships ?? []} />
}
