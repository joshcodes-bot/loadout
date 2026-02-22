'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './recap.module.css'

export default function RecapClient({ clips, coachId, profile }: { clips: any[]; coachId: string; profile: any }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localComments, setLocalComments] = useState<Record<string, any[]>>({})
  const feedRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})

  const current = clips[currentIdx]

  // Scroll snap detection
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const onScroll = () => {
      const idx = Math.round(feed.scrollTop / feed.clientHeight)
      setCurrentIdx(idx)
    }
    feed.addEventListener('scroll', onScroll, { passive: true })
    return () => feed.removeEventListener('scroll', onScroll)
  }, [])

  // Autoplay current video
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (!el) return
      if (id === current?.video?.id) {
        el.play().catch(() => {})
      } else {
        el.pause()
        el.currentTime = 0
      }
    })
  }, [currentIdx, current])

  const scrollTo = (idx: number) => {
    feedRef.current?.scrollTo({ top: idx * feedRef.current.clientHeight, behavior: 'smooth' })
  }

  const postComment = async () => {
    if (!commentText.trim() || !current) return
    setSubmitting(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('comments')
      .insert({
        exercise_id: current.exercise.id,
        coach_id: coachId,
        athlete_id: current.exercise.athlete_id,
        body: commentText.trim(),
      })
      .select()
      .single()

    if (data) {
      setLocalComments(prev => ({
        ...prev,
        [current.exercise.id]: [data, ...(prev[current.exercise.id] ?? [])],
      }))
    }
    setCommentText('')
    setSubmitting(false)
  }

  if (clips.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📹</div>
        <div className={styles.emptyTitle}>NO CLIPS THIS WEEK</div>
        <p className={styles.emptySub}>Your athlete hasn't attached any videos yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      {/* TikTok feed */}
      <div className={styles.feed} ref={feedRef}>
        {clips.map((clip, i) => {
          const ex = clip.exercise
          const vid = clip.video
          const planned = `${ex.sets}×${ex.reps}${ex.load_kg ? ` @ ${ex.load_kg}kg` : ''}`
          const actual = ex.actual_load
            ? `${ex.actual_load}kg × ${ex.actual_reps ?? ex.reps}`
            : 'Not logged'
          const match = ex.actual_load && ex.load_kg
            ? ex.actual_load >= ex.load_kg ? 'green' : 'red'
            : 'grey'

          return (
            <div key={vid.id} className={styles.feedCard} onClick={() => scrollTo(i)}>
              {/* Video or placeholder */}
              {vid.public_url ? (
                <video
                  ref={el => { videoRefs.current[vid.id] = el }}
                  className={styles.video}
                  src={vid.public_url}
                  loop
                  muted
                  playsInline
                />
              ) : (
                <div className={styles.videoPlaceholder}>📹</div>
              )}

              <div className={styles.feedGradient} />

              <div className={styles.counter}>{i + 1} / {clips.length}</div>

              <div className={styles.feedSide}>
                <div className={styles.sideAction}>
                  <span>✓</span>
                  <span className={styles.sideLabel}>Good</span>
                </div>
                <div className={styles.sideAction}>
                  <span>⚑</span>
                  <span className={styles.sideLabel}>Flag</span>
                </div>
              </div>

              <div className={styles.feedContent}>
                <div className={styles.dayLabel}>{ex.session?.day_label ?? ''} SESSION</div>
                <div className={styles.exerciseName}>{ex.name}</div>
                <div className={styles.statRow}>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>PLANNED</div>
                    <div className={styles.statValue}>{planned}</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>ACTUAL</div>
                    <div className={`${styles.statValue} ${styles[match]}`}>{actual}</div>
                  </div>
                  {ex.actual_rpe && (
                    <div className={styles.stat}>
                      <div className={styles.statLabel}>RPE</div>
                      <div className={styles.statValue}>{ex.actual_rpe}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Coach panel */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelMeta}>REVIEWING</div>
            <div className={styles.panelTitle}>WEEKLY RECAP</div>
            <div className={styles.panelSub}>{profile?.full_name ?? 'Athlete'} · {clips.length} clips</div>
          </div>
          <div className={styles.progress}>
            <div className={styles.progressVal}>{currentIdx + 1}/{clips.length}</div>
            <div className={styles.progressLabel}>clips</div>
          </div>
        </div>

        {current && (
          <>
            <div className={styles.commentBox}>
              <div className={styles.commentLabel}>
                Note on: {current.exercise.name}
              </div>
              <textarea
                className={styles.commentInput}
                placeholder={`Leave feedback on this set…`}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={3}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) postComment() }}
              />
              <div className={styles.commentActions}>
                <button className="btn btn-primary btn-sm" onClick={postComment} disabled={submitting || !commentText.trim()}>
                  {submitting ? 'Posting…' : 'Post Note'}
                </button>
                <span className={styles.hint}>⌘↵ to send</span>
              </div>
            </div>

            <div className={styles.clipNav}>
              {clips.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.clipDot} ${i === currentIdx ? styles.clipDotActive : ''}`}
                  onClick={() => scrollTo(i)}
                />
              ))}
            </div>

            {/* Comments for current exercise */}
            {(() => {
              const exId = current.exercise.id
              const all = [...(localComments[exId] ?? []), ...(current.exercise.comments ?? [])]
              return all.length > 0 ? (
                <div className={styles.commentList}>
                  <div className={styles.commentListTitle}>FEEDBACK · {all.length}</div>
                  {all.map((c: any, i: number) => (
                    <div key={c.id ?? i} className={styles.commentItem}>
                      <div className={styles.commentMeta}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                      <div className={styles.commentBody}>{c.body}</div>
                    </div>
                  ))}
                </div>
              ) : null
            })()}
          </>
        )}
      </div>
    </div>
  )
}
