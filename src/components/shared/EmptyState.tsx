import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export default function EmptyState({ icon, title, description, action, className = '' }: Props) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <span className="empty-state-icon">{icon}</span>}
      <p className="empty-state-text">{title}</p>
      {description && <p className="empty-state-sub">{description}</p>}
      {action && (
        <button
          className="btn-primary"
          style={{ marginTop: 12 }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
