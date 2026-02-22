export type Role = 'athlete' | 'coach'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  weight_class: string | null
  created_at: string
}

export interface Program {
  id: string
  athlete_id: string
  name: string
  week_number: number
  start_date: string | null
  raw_csv: string | null
  created_at: string
}

export interface Session {
  id: string
  program_id: string
  athlete_id: string
  day_label: string
  session_date: string | null
  session_type: string | null
  created_at: string
  exercises?: Exercise[]
}

export interface Exercise {
  id: string
  session_id: string
  athlete_id: string
  name: string
  sets: number | null
  reps: string | null
  load_kg: number | null
  rpe_target: number | null
  notes: string | null
  actual_load: number | null
  actual_reps: string | null
  actual_rpe: number | null
  sort_order: number
  created_at: string
  videos?: Video[]
  comments?: Comment[]
}

export interface Video {
  id: string
  exercise_id: string
  athlete_id: string
  storage_path: string
  public_url: string | null
  set_number: number
  created_at: string
}

export interface Comment {
  id: string
  exercise_id: string
  coach_id: string
  athlete_id: string
  body: string
  created_at: string
  coach?: Profile
}

// CSV row shape after parsing
export interface CsvRow {
  Day: string
  Exercise: string
  Sets: string
  Reps: string
  Load_kg: string
  RPE: string
  Notes?: string
}
