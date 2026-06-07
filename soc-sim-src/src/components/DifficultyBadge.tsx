const STYLES = {
  beginner:     'bg-primary-container text-on-primary-container',
  intermediate: 'bg-yellow-500 text-background',
  advanced:     'bg-red-600 text-white',
}

export default function DifficultyBadge({ difficulty }: { difficulty: 'beginner' | 'intermediate' | 'advanced' }) {
  return (
    <span className={`px-2 py-0.5 font-label-caps text-label-caps ${STYLES[difficulty]}`}>
      {difficulty.toUpperCase()}
    </span>
  )
}
