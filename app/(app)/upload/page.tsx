'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import styles from './upload.module.css'

const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface ParsedExercise {
  day: string
  name: string
  sets: number | null
  reps: string | null
  load_kg: number | null
  rpe_target: number | null
  coach_notes: string | null
}

// Detects which format the CSV is in
function detectFormat(rows: any[]): 'standard' | 'josh' {
  // Josh format: first column contains day names, no proper headers,
  // has an 'x' column between sets and reps
  const firstColValues = rows.slice(0, 10).map(r => Object.values(r)[0] as string).filter(Boolean)
  const hasDayNames = firstColValues.some(v => VALID_DAYS.includes(v?.trim()))
  const hasXCol = rows.some(r => Object.values(r).some(v => (v as string)?.trim() === 'x'))
  return (hasDayNames && hasXCol) ? 'josh' : 'standard'
}

function parseJoshFormat(raw: any[][]): ParsedExercise[] {
  // raw is array of arrays (no header parsing)
  const exercises: ParsedExercise[] = []
  let currentDay = ''

  for (const row of raw) {
    const col0 = (row[0] ?? '').toString().trim()
    const col1 = (row[1] ?? '').toString().trim()

    // Skip blank rows and header rows
    if (!col1 || col1.toLowerCase() === 'exercise') continue

    // Check if col0 is a day name
    if (VALID_DAYS.includes(col0)) currentDay = col0

    // Skip if no day yet or no exercise name
    if (!currentDay || !col1) continue

    // Skip week header rows (col1 starts with 'Week')
    if (col1.startsWith('Week')) continue

    // Col layout: [Day, Exercise, Sets, x, Reps, Target Weight, @, Target RPE, Actual Weight, 1,2,3,4,5, Coach Notes, Client Notes]
    const sets = parseInt((row[2] ?? '').toString()) || null
    // col3 is 'x' — skip
    const reps = (row[4] ?? '').toString().trim() || null
    const targetWeight = (row[5] ?? '').toString().trim()
    const rpeRaw = (row[7] ?? '').toString().trim()
    const coachNotes = (row[14] ?? '').toString().trim() || null

    // Parse load — take first number from ranges like "145-147.5"
    const loadMatch = targetWeight.match(/[\d.]+/)
    const load_kg = loadMatch ? parseFloat(loadMatch[0]) : null

    const rpe_target = parseFloat(rpeRaw) || null

    if (col1 && currentDay) {
      exercises.push({
        day: currentDay,
        name: col1,
        sets,
        reps,
        load_kg,
        rpe_target,
        coach_notes: coachNotes,
      })
    }
  }

  return exercises
}

function parseStandardFormat(rows: any[]): ParsedExercise[] {
  return rows
    .filter(r => r.Day?.trim() && r.Exercise?.trim())
    .map(r => ({
      day: r.Day.trim(),
      name: r.Exercise.trim(),
      sets: parseInt(r.Sets) || null,
      reps: r.Reps?.trim() || null,
      load_kg: parseFloat(r.Load_kg) || null,
      rpe_target: parseFloat(r.RPE) || null,
      coach_notes: r.Notes?.trim() || null,
    }))
}

export default function UploadPage() {
  const router = useRouter()
  const [isDrag, setIsDrag] = useState(false)
  const [exercises, setExercises] = useState<ParsedExercise[]>([])
  const [fileName, setFileName] = useState('')
  const [programName, setProgramName] = useState('')
  const [weekNumber, setWeekNumber] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [detectedFormat, setDetectedFormat] = useState<string>('')

  const parseFile = (file: File) => {
    setFileName(file.name)

    // Extract week number from filename e.g. "Week_50"
    const weekMatch = file.name.match(/week[_\s-]?(\d+)/i)
    if (weekMatch) setWeekNumber(parseInt(weekMatch[1]))
    setProgramName(file.name.replace(/\.csv$/i, '').replace(/[-_]/g, ' ').trim())

    // First pass: detect format by parsing without headers
    Papa.parse(file, {
      header: false,
      complete: (rawResult) => {
        const raw = rawResult.data as any[][]
        // Check if it looks like Josh's format
        const hasXCol = raw.some(r => r.some((v: any) => v?.toString().trim() === 'x'))
        const hasDayInFirstCol = raw.some(r => VALID_DAYS.includes((r[0] ?? '').toString().trim()))

        if (hasXCol && hasDayInFirstCol) {
          setDetectedFormat('Your coach\'s format (auto-detected)')
          const parsed = parseJoshFormat(raw)
          setExercises(parsed)
        } else {
          // Standard format — re-parse with headers
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
              setDetectedFormat('Standard format')
              setExercises(parseStandardFormat(result.data))
            },
          })
        }
      },
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDrag(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) parseFile(file)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!exercises.length || !programName) return
    setImporting(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setImporting(false); return }

    // Create program
    const { data: program, error: progErr } = await supabase
      .from('programs')
      .insert({ athlete_id: user.id, name: programName, week_number: weekNumber, start_date: startDate || null })
      .select()
      .single()

    if (progErr || !program) { setError(progErr?.message ?? 'Failed to create program'); setImporting(false); return }

    // Group by day preserving order
    const byDay: Record<string, ParsedExercise[]> = {}
    exercises.forEach(ex => {
      if (!byDay[ex.day]) byDay[ex.day] = []
      byDay[ex.day].push(ex)
    })

    for (const [day, exs] of Object.entries(byDay)) {
      const { data: session } = await supabase
        .from('sessions')
        .insert({
          program_id: program.id,
          athlete_id: user.id,
          day_label: day,
          session_type: Array.from(new Set(exs.map(e => e.name.split(' ')[0]))).slice(0, 2).join('/'),
        })
        .select()
        .single()

      if (!session) continue

      await supabase.from('exercises').insert(
        exs.map((ex, i) => ({
          session_id: session.id,
          athlete_id: user.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          load_kg: ex.load_kg,
          rpe_target: ex.rpe_target,
          notes: ex.coach_notes,
          sort_order: i,
        }))
      )
    }

    router.push('/program')
  }

  const uniqueDays = Array.from(new Set(exercises.map(e => e.day)))

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>UPLOAD CSV</h1>
          <p className={styles.sub}>Supports your coach's format and standard CSV format</p>
        </div>
      </div>

      {exercises.length === 0 ? (
        <>
          <div
            className={`${styles.dropZone} ${isDrag ? styles.drag : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDrag(true) }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <input id="csv-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
            <div className={styles.dropIcon}>📋</div>
            <div className={styles.dropTitle}>DROP YOUR PROGRAM CSV</div>
            <div className={styles.dropSub}>or click to browse · your coach's format is supported</div>
          </div>
        </>
      ) : (
        <>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.previewHeader}>
            <div>
              <div className={styles.fileName}>✓ {fileName}</div>
              <div className={styles.fileMeta}>
                {exercises.length} exercises · {uniqueDays.length} training days · {detectedFormat}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setExercises([]); setFileName('') }}>Re-upload</button>
          </div>

          <div className={styles.metaForm}>
            <div className={styles.metaField}>
              <label className={styles.metaLabel}>Program Name</label>
              <input className={styles.metaInput} value={programName} onChange={e => setProgramName(e.target.value)} placeholder="e.g. Week 50" />
            </div>
            <div className={styles.metaField}>
              <label className={styles.metaLabel}>Week Number</label>
              <input className={styles.metaInput} type="number" value={weekNumber} onChange={e => setWeekNumber(parseInt(e.target.value) || 1)} min={1} />
            </div>
            <div className={styles.metaField}>
              <label className={styles.metaLabel}>Start Date (optional)</label>
              <input className={styles.metaInput} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className={styles.previewTable}>
            <table>
              <thead>
                <tr>
                  {['Day', 'Exercise', 'Sets × Reps', 'Target Load', 'RPE', 'Coach Notes'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex, i) => (
                  <tr key={i}>
                    <td>{ex.day}</td>
                    <td>{ex.name}</td>
                    <td className={styles.mono}>{ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : '—'}</td>
                    <td className={styles.mono}>{ex.load_kg ? `${ex.load_kg}kg` : '—'}</td>
                    <td className={styles.mono}>{ex.rpe_target ?? '—'}</td>
                    <td className={styles.grey}>{ex.coach_notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={importing || !programName}>
              {importing ? 'Importing…' : `Import ${exercises.length} exercises →`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
