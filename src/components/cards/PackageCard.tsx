import type { PackageDto } from '../../types/api.types'

const TYPE_ICONS: Record<string, string> = {
  Basic: '🥉',
  Premium: '🥈',
  Elite: '🥇',
}

const TYPE_TR: Record<string, string> = {
  Basic: 'Temel',
  Premium: 'Premium',
  Elite: 'Elit',
}

interface Props {
  pkg: PackageDto
  onSelect: (pkg: PackageDto) => void
}

export default function PackageCard({ pkg, onSelect }: Props) {
  const icon = TYPE_ICONS[pkg.type] ?? '📦'
  const typeLabel = TYPE_TR[pkg.type] ?? pkg.type
  const durationMonths = pkg.durationDays >= 30 ? `${Math.round(pkg.durationDays / 30)} ay` : `${pkg.durationDays} gün`

  return (
    <div className={`package-card package-card--${pkg.type.toLowerCase()}`}>
      <div className="package-card-header">
        <span className="package-icon">{icon}</span>
        <span className={`package-type-badge badge-type-${pkg.type.toLowerCase()}`}>{typeLabel}</span>
      </div>

      <div className="package-name">{pkg.name}</div>
      <div className="package-price">
        <span className="price-amount">{pkg.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
        <span className="price-period">/ {durationMonths}</span>
      </div>

      {pkg.description && (
        <p className="package-desc">{pkg.description}</p>
      )}

      <button
        className="btn-select-package"
        onClick={() => onSelect(pkg)}
      >
        Seç
      </button>
    </div>
  )
}
