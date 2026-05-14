import type { PhotoViewType } from '../../types/api.types'

interface Props {
  view: PhotoViewType
  active?: boolean
}

/**
 * Stylized human body silhouettes for the 4 photo upload positions.
 * Color: `currentColor` so caller controls via CSS.
 */
export default function PoseSilhouette({ view, active }: Props) {
  const color = active ? 'var(--accent)' : 'var(--text-muted)'
  return (
    <svg
      viewBox="0 0 60 120"
      width={60}
      height={120}
      style={{ color, opacity: active ? 1 : 0.7 }}
      aria-hidden
    >
      {view === 'Front' && <FrontPath />}
      {view === 'Back' && <BackPath />}
      {view === 'Left' && <SidePath flip={false} />}
      {view === 'Right' && <SidePath flip={true} />}
    </svg>
  )
}

function FrontPath() {
  return (
    <g fill="currentColor">
      {/* head */}
      <circle cx="30" cy="14" r="8" />
      {/* torso + arms + legs as a single combined silhouette */}
      <path d="M22 22 h16 v6 l8 4 v22 l-4 2 v-14 h-4 v32 h-3 v22 h-4 v-22 h-4 v22 h-4 v-22 h-3 v-32 h-4 v14 l-4 -2 v-22 l8 -4 z" />
    </g>
  )
}

function BackPath() {
  // Same silhouette as front but slightly different head detail (no face)
  return (
    <g fill="currentColor">
      <circle cx="30" cy="14" r="8" />
      <path d="M22 22 h16 v6 l8 4 v22 l-4 2 v-14 h-4 v32 h-3 v22 h-4 v-22 h-4 v22 h-4 v-22 h-3 v-32 h-4 v14 l-4 -2 v-22 l8 -4 z" />
      {/* subtle spine line to differentiate */}
      <rect x="29.5" y="30" width="1" height="46" fill="var(--surface)" opacity="0.4" />
    </g>
  )
}

function SidePath({ flip }: { flip: boolean }) {
  // Profile view — head + body curve
  const transform = flip ? 'translate(60, 0) scale(-1, 1)' : ''
  return (
    <g fill="currentColor" transform={transform}>
      {/* head profile */}
      <circle cx="28" cy="14" r="8" />
      {/* nose hint */}
      <path d="M36 12 l3 2 l-3 2 z" />
      {/* body profile */}
      <path d="M22 22 q-3 6 -2 14 v14 q-2 4 -2 8 v18 q1 22 4 30 h6 q-2 -22 0 -34 v-2 q2 12 4 36 h6 q-1 -32 -2 -42 v-14 q1 -8 -2 -14 q-2 -10 -6 -14 h-6 z" />
    </g>
  )
}
