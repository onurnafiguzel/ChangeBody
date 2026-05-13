import { useState } from 'react'
import ExerciseRow from './ExerciseRow'
import type { ExerciseDto, ProgramExerciseDetail } from '../../types/api.types'

const DAY_N_REGEX = /^Day-\d+$/i

const WEEKDAY_ORDER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
  Pazartesi: 1, Salı: 2, Çarşamba: 3, Perşembe: 4, Cuma: 5, Cumartesi: 6, Pazar: 7,
}

const DAY_TR: Record<string, string> = {
  Monday: 'Pazartesi', Tuesday: 'Salı', Wednesday: 'Çarşamba',
  Thursday: 'Perşembe', Friday: 'Cuma', Saturday: 'Cumartesi', Sunday: 'Pazar',
}

function dayOrder(key: string): number {
  const m = key.match(/Day-(\d+)/i)
  if (m) return parseInt(m[1], 10)
  if (WEEKDAY_ORDER[key] != null) return 100 + WEEKDAY_ORDER[key]
  return 1000
}

function displayDay(key: string): string {
  const m = key.match(/Day-(\d+)/i)
  if (m) return `Gün ${m[1]}`
  return DAY_TR[key] ?? key
}

interface Props {
  dailyExercises?: Record<string, ProgramExerciseDetail[]> | null
  exerciseMap: Map<string, ExerciseDto>
  onExerciseSelect?: (exercise: ExerciseDto) => void
  onStartDay?: (dayKey: string) => void
}

export default function ScheduleView({
  dailyExercises,
  exerciseMap,
  onExerciseSelect,
  onStartDay,
}: Props) {
  const days = Object.entries(dailyExercises ?? {}).sort(([a], [b]) => dayOrder(a) - dayOrder(b))
  const [openDays, setOpenDays] = useState<Set<string>>(new Set())

  function toggle(day: string) {
    setOpenDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  if (days.length === 0) {
    return <p className="placeholder-desc">Program içeriği henüz eklenmedi.</p>
  }

  return (
    <div className="schedule-readonly">
      {days.map(([day, exercises]) => {
        const isOpen = openDays.has(day)
        const canStart = DAY_N_REGEX.test(day) && exercises.length > 0
        return (
          <div key={day} className={`schedule-day-block ${isOpen ? 'open' : ''}`}>
            <div className="schedule-day-header-row">
              <button
                type="button"
                className="schedule-day-toggle"
                onClick={() => toggle(day)}
                aria-expanded={isOpen}
                aria-controls={`schedule-day-${day}`}
              >
                <span className={`schedule-day-chevron ${isOpen ? 'open' : ''}`} aria-hidden>▸</span>
                <span className="schedule-day-title">{displayDay(day)}</span>
                <span className="schedule-day-count">
                  {exercises.length === 0 ? 'Dinlenme' : `${exercises.length} egzersiz`}
                </span>
              </button>
              {onStartDay && (
                <button
                  className="btn-workout-start"
                  disabled={!canStart}
                  onClick={() => canStart && onStartDay(day)}
                  title={canStart ? 'İdman kaydını başlat' : 'Bu gün için kayıt formatı uygun değil (Day-N gerekli)'}
                >
                  🏋️ Başlat
                </button>
              )}
            </div>

            {isOpen && (
              <div id={`schedule-day-${day}`}>
                {exercises.length === 0 ? (
                  <div className="schedule-rest">Dinlenme Günü</div>
                ) : (
                  <ul className="schedule-exercise-list">
                    {exercises.map((ex, idx) => (
                      <ExerciseRow
                        key={`${day}-${idx}`}
                        detail={ex}
                        exercise={exerciseMap.get(ex.exerciseId)}
                        onSelect={onExerciseSelect}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
