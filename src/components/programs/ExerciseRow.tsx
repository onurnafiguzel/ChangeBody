import { MUSCLE_TR } from '../exercises/ExerciseCard'
import type { ExerciseDto, ProgramExerciseDetail } from '../../types/api.types'

interface Props {
  detail: ProgramExerciseDetail
  exercise?: ExerciseDto
  onSelect?: (exercise: ExerciseDto) => void
}

export default function ExerciseRow({ detail, exercise, onSelect }: Props) {
  const clickable = !!exercise && !!onSelect

  function handleSelect() {
    if (exercise && onSelect) onSelect(exercise)
  }

  return (
    <li
      onClick={clickable ? handleSelect : undefined}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleSelect()
        }
      }}
    >
      <span className="schedule-exercise-meta">
        <strong>{exercise?.name ?? '(Bilinmeyen egzersiz)'}</strong>
        {exercise?.muscleGroup && <> · {MUSCLE_TR[exercise.muscleGroup] ?? exercise.muscleGroup}</>}
        <> · {detail.sets} set · {detail.reps} tekrar</>
      </span>
      {detail.explanation && <div className="schedule-exercise-note">💬 {detail.explanation}</div>}
    </li>
  )
}
