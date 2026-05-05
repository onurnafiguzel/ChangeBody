import type { ExerciseDto } from '../../types/api.types'
import '../../styles/exercises.css'

const MUSCLE_ICONS: Record<string, string> = {
  Chest: '🫁', Back: '🔙', Shoulders: '🤸', Biceps: '💪',
  Triceps: '💪', Forearms: '🦾', Legs: '🦵', Glutes: '🍑',
  Core: '⚡', Cardio: '❤️',
}

const MUSCLE_TR: Record<string, string> = {
  Chest: 'Göğüs', Back: 'Sırt', Shoulders: 'Omuz', Biceps: 'Biseps',
  Triceps: 'Triseps', Forearms: 'Önkol', Legs: 'Bacak', Glutes: 'Kalça',
  Core: 'Core', Cardio: 'Kardiyo',
}

const DIFFICULTY_TR: Record<string, string> = {
  Beginner: 'Başlangıç', Intermediate: 'Orta', Advanced: 'İleri',
}

interface Props {
  exercise: ExerciseDto
  onClick: (exercise: ExerciseDto) => void
}

export default function ExerciseCard({ exercise, onClick }: Props) {
  const diffClass = exercise.difficultyLevel?.toLowerCase() ?? ''

  return (
    <button className="exercise-card" onClick={() => onClick(exercise)}>
      <span className="exercise-card-icon">
        {MUSCLE_ICONS[exercise.muscleGroup] ?? '🏋️'}
      </span>
      <div className="exercise-card-name">{exercise.name}</div>
      <div className="exercise-card-muscle">{MUSCLE_TR[exercise.muscleGroup] ?? exercise.muscleGroup}</div>
      <div className="exercise-card-badges">
        {exercise.difficultyLevel && (
          <span className={`badge badge-${diffClass}`}>
            {DIFFICULTY_TR[exercise.difficultyLevel] ?? exercise.difficultyLevel}
          </span>
        )}
      </div>
      {exercise.description && (
        <div className="exercise-card-desc">{exercise.description}</div>
      )}
    </button>
  )
}

export { MUSCLE_TR, DIFFICULTY_TR, MUSCLE_ICONS }
