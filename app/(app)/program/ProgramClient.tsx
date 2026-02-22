'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './program.module.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ProgramClient({ program, athleteId }: { program: any; athleteId: string }) {
  const sessions: any[] = program.sessions ?? []
  const sessionsByDay: Record<string, any> = {}
  sessions.forEach((s: any) => { sessionsByDay[s.day_label] = s })

  const [activeDay, setActiveDay] = useState(() => {
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
    return sessionsByDay[dow] ? dow : (sessions[0]?.day_label ?? 'Mon')
  })
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [localVideos, setLocalVideos] = useState<Record<string, any[]>>({})
  const [actuals, setActuals] = useState<Record<string, { load: string; reps: string; rpe: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetId = useRef<string | null>(null)

  const activeSession = sessionsByDay[activeDay]
  const exercises: any[] = activeSession?.exercises ?? []

  const getRpeClass = (rpe: number | null) => {
    if (!rpe) return ''
    if (rpe >= 8.5) return styles.rpeHigh
    if (rpe >= 7.5) return styles.rpeMid
    return styles.rpeLow
  }

  const triggerUpload = (exerciseId: string) => {
    uploadTargetId.current = exerciseId
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const exId = uploadTargetId.current
    if (!file || !exId) return
    e.target.value = ''

    setUploadingId(exId)
    const supabase = createClient()
    const path = `${athleteId}/${exId}/${Date.now()}_${file.name}`

    const { error: upErr } = await supabase.storage.from('videos').upload(path, file)
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploadingId(null); return }

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(path)

    const { data: video } = await supabase
      .from('videos')
      .insert({ exercise_id: exId, athlete_id: athleteId, storage_path: path, public_url: urlData.publicUrl })
      .select()
      .single()

    if (video) {
      setLocalVideos(prev => ({ ...prev, [exId]: [...(prev[exId] ?? []), video] }))
    }
    setUploadingId(null)
  }

  const saveActuals = async (exId: string) => {
    const vals = actuals[exId]
    if (!vals) return
    setSavingId(exId)
    const supabase = createClient()
    await supabase.from('exercises').update({
      actual_load: parseFloat(vals.load) || null,
      actual_reps: vals.reps || null,
      actual_rpe: parseFloat(vals.rpe) || null,
    }).eq('id', exId)
    setSavingId(null)
  }

  return (
    <div className={styles.page}>
      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>PROGRAM</h1>
          <p className={styles.sub}>{program.name} · Week {program.week_number}</p>
        </div>
      </div>

      {/* Day tabs */}
      <div className={styles.dayTabs}>
        {DAYS.map(d => (
          <button
            key={d}
            className={`${styles.dayTab} ${activeDay === d ? styles.active : ''} ${!sessionsByDay[d] ? styles.rest : ''}`}
            onClick={() => setActiveDay(d)}
          >
            {d}
            {sessionsByDay[d] && <span className={styles.dayDot} />}
          </button>
        ))}
      </div>

      {activeSession ? (
        <div className={styles.sessionCard}>
          <div className={styles.sessionHeader}>
            <div className={styles.sessionType}>{activeSession.session_type ?? activeDay} SESSION</div>
            <div className={styles.sessionMeta}>{exercises.length} exercises</div>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Programmed</th>
                <th>RPE</th>
                <th>Actual Load</th>
                <th>Actual Reps</th>
                <th>Actual RPE</th>
                <th>Video</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex: any) => {
                const allVideos = [...(ex.videos ?? []), ...(localVideos[ex.id] ?? [])]
                const a = actuals[ex.id] ?? {}
                return (
                  <tr key={ex.id}>
                    <td>
                      <div className={styles.exName}>{ex.name}</div>
                      {ex.notes && <div className={styles.exNotes}>{ex.notes}</div>}
                    </td>
                    <td className={styles.programmed}>
                      {ex.sets} × {ex.reps}
                      {ex.load_kg && <span className={styles.load}> @ {ex.load_kg}kg</span>}
                    </td>
                    <td>
                      {ex.rpe_target && (
                        <span className={`${styles.rpePill} ${getRpeClass(ex.rpe_target)}`}>
                          {ex.rpe_target}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        className={styles.actualInput}
                        placeholder={ex.load_kg ? `${ex.load_kg}` : 'kg'}
                        value={a.load ?? ex.actual_load ?? ''}
                        onChange={e => setActuals(p => ({ ...p, [ex.id]: { ...p[ex.id], load: e.target.value } }))}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.actualInput}
                        placeholder={ex.reps ?? 'reps'}
                        value={a.reps ?? ex.actual_reps ?? ''}
                        onChange={e => setActuals(p => ({ ...p, [ex.id]: { ...p[ex.id], reps: e.target.value } }))}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.actualInput}
                        placeholder="RPE"
                        value={a.rpe ?? ex.actual_rpe ?? ''}
                        onChange={e => setActuals(p => ({ ...p, [ex.id]: { ...p[ex.id], rpe: e.target.value } }))}
                      />
                    </td>
                    <td>
                      <div className={styles.videoCell}>
                        {allVideos.length > 0 && (
                          <span className={styles.videoCount}>▶ {allVideos.length}</span>
                        )}
                        <button
                          className={styles.attachBtn}
                          onClick={() => triggerUpload(ex.id)}
                          disabled={uploadingId === ex.id}
                        >
                          {uploadingId === ex.id ? '↑ uploading…' : '+ clip'}
                        </button>
                        {actuals[ex.id] && (
                          <button
                            className={`${styles.saveBtn} btn btn-primary btn-sm`}
                            onClick={() => saveActuals(ex.id)}
                            disabled={savingId === ex.id}
                          >
                            {savingId === ex.id ? '…' : '✓'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.restDay}>
          <div>💤</div>
          <div className={styles.restTitle}>REST DAY</div>
          <p>Recovery is part of the program.</p>
        </div>
      )}
    </div>
  )
}
