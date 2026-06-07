import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listScenarios } from '../api'
import type { ScenarioMeta } from '../types'
import DifficultyBadge from '../components/DifficultyBadge'
import ErrorMessage from '../components/ErrorMessage'

function useGlitch(text: string) {
  const [display, setDisplay] = useState(text)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startGlitch() {
    let iterations = 0
    intervalRef.current = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' '
            if (i < iterations) return text[i]
            return String.fromCharCode(65 + Math.floor(Math.random() * 26))
          })
          .join(''),
      )
      if (iterations >= text.length) {
        clearInterval(intervalRef.current!)
        setDisplay(text)
      }
      iterations += 1 / 3
    }, 30)
  }

  function stopGlitch() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setDisplay(text)
  }

  return { display, startGlitch, stopGlitch }
}

function ScenarioCard({ scenario }: { scenario: ScenarioMeta }) {
  const navigate = useNavigate()
  const { display, startGlitch, stopGlitch } = useGlitch(`> ${scenario.title.toUpperCase()}`)

  const stripeColor: Record<string, string> = {
    beginner:     'bg-primary-container',
    intermediate: 'bg-yellow-500',
    advanced:     'bg-error',
  }

  return (
    <div
      className="relative bg-surface-container-low border border-outline-variant p-gutter hover:border-primary-container transition-all group overflow-hidden cursor-pointer"
      onClick={() => navigate(`/scenarios/${scenario.id}`)}
      onMouseEnter={startGlitch}
      onMouseLeave={stopGlitch}
    >
      {/* Severity stripe */}
      <div className={`absolute left-0 top-0 w-1 h-full ${stripeColor[scenario.difficulty] ?? 'bg-outline-variant'}`} />

      <div className="flex justify-between items-start mb-4 pl-2">
        <h3 className="font-headline-md text-headline-md text-primary group-hover:text-primary-container transition-colors truncate flex-1 mr-2">
          {display}
        </h3>
        <DifficultyBadge difficulty={scenario.difficulty} />
      </div>

      <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 pl-2 leading-relaxed">
        {scenario.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-8 pl-2">
        {scenario.tags.map(tag => (
          <span key={tag} className="bg-surface-variant text-on-surface-variant px-2 py-1 font-code-sm text-code-sm">
            [ {tag} ]
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center border-t border-outline-variant pt-4 pl-2">
        <div className="flex items-center gap-2 font-code-sm text-code-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-sm">notifications</span>
          {scenario.alertCount} ALERTS
        </div>
        <button className="text-primary-container hover:text-primary font-label-caps text-label-caps transition-colors flex items-center gap-2">
          [ START → ]
        </button>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="relative bg-surface-container-low border border-outline-variant p-gutter overflow-hidden opacity-50">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 w-48 bg-surface-variant animate-pulse" />
        <div className="h-6 w-24 bg-surface-variant animate-pulse" />
      </div>
      <div className="h-4 w-full bg-surface-variant animate-pulse mb-2" />
      <div className="h-4 w-3/4 bg-surface-variant animate-pulse mb-6" />
      <div className="flex gap-2 mb-8">
        <div className="h-6 w-16 bg-surface-variant animate-pulse" />
        <div className="h-6 w-16 bg-surface-variant animate-pulse" />
      </div>
      <div className="flex justify-center items-center border-t border-outline-variant pt-4">
        <span className="font-code-sm text-code-sm text-on-surface-variant animate-pulse">[LOADING...]</span>
      </div>
    </div>
  )
}

export default function Practice() {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listScenarios()
      .then(res => setScenarios(res.scenarios))
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load scenarios')
      })
      .finally(() => setLoading(false))
  }, [])

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  return (
    <div className="p-margin max-w-7xl mx-auto">
      {/* Section header */}
      <div className="flex justify-between items-end mb-8 border-b border-outline-variant pb-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary-container uppercase tracking-widest">
            // AVAILABLE SCENARIOS
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            SELECT OPERATIONAL PARAMETERS TO INITIATE ENVIRONMENT
          </p>
        </div>
        <div className="flex gap-4 font-code-sm text-code-sm text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-primary-container" />
            ACTIVE: {scenarios.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-error" />
            CRITICAL: {scenarios.filter(s => s.difficulty === 'advanced').length}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorMessage message={error} className="mb-6" />}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : scenarios.map(s => <ScenarioCard key={s.id} scenario={s} />)
        }
      </div>

      {/* Terminal footer */}
      {!loading && (
        <div className="mt-margin bg-surface-container-lowest border border-outline-variant p-4 font-code-sm text-code-sm text-on-surface-variant">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-primary-container rounded-full animate-pulse" />
            <span className="text-primary-container">SYSTEM STATUS: OPTIMAL</span>
            <span className="ml-auto opacity-50">v1.0.0-STABLE</span>
          </div>
          <div className="text-on-surface-variant opacity-70 space-y-1">
            <div>[{now}] Session authenticated</div>
            <div>[{now}] Simulation environments loaded: {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} available</div>
            <div>
              [SYS] Waiting for mission selection
              <span className="block-cursor" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
