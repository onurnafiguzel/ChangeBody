import type { CSSProperties } from 'react'

export type SkeletonVariant = 'card' | 'row' | 'text' | 'circle'

interface Props {
  variant?: SkeletonVariant
  width?: number | string
  height?: number | string
  count?: number
  className?: string
  style?: CSSProperties
}

const VARIANT_STYLE: Record<SkeletonVariant, CSSProperties> = {
  card: { height: 140, borderRadius: 12 },
  row: { height: 48, borderRadius: 8 },
  text: { height: 14, borderRadius: 4, width: '60%' },
  circle: { width: 40, height: 40, borderRadius: '50%' },
}

export default function Skeleton({
  variant = 'card',
  width,
  height,
  count = 1,
  className = '',
  style,
}: Props) {
  const merged: CSSProperties = {
    ...VARIANT_STYLE[variant],
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    marginBottom: count > 1 ? 8 : undefined,
    ...style,
  }

  if (count === 1) {
    return <div className={`skeleton ${className}`} style={merged} aria-hidden="true" />
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${className}`}
          style={merged}
          aria-hidden="true"
        />
      ))}
    </>
  )
}
