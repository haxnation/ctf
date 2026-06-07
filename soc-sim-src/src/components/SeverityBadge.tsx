import type { AlertSeverity } from '../types'

const STYLES: Record<AlertSeverity, string> = {
  critical:     'bg-error text-on-error',
  high:         'bg-orange-500 text-white',
  medium:       'bg-yellow-500 text-on-secondary',
  low:          'bg-blue-500 text-white',
  informational:'bg-surface-variant text-on-surface-variant border border-outline-variant',
}

const LABELS: Record<AlertSeverity, string> = {
  critical:     'CRIT',
  high:         'HIGH',
  medium:       'MED',
  low:          'LOW',
  informational:'INFO',
}

const TEXT_COLORS: Record<AlertSeverity, string> = {
  critical:     'text-error',
  high:         'text-orange-400',
  medium:       'text-yellow-400',
  low:          'text-blue-400',
  informational:'text-on-surface-variant',
}

interface Props {
  severity: AlertSeverity
  variant?: 'badge' | 'text'
}

export default function SeverityBadge({ severity, variant = 'badge' }: Props) {
  if (variant === 'text') {
    return (
      <span className={`font-label-caps text-label-caps ${TEXT_COLORS[severity]}`}>
        {LABELS[severity]}
      </span>
    )
  }
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold ${STYLES[severity]}`}>
      {LABELS[severity]}
    </span>
  )
}

export { TEXT_COLORS as severityTextColors, STYLES as severityBadgeStyles }
