import { useDiagramAnimation } from './useDiagramAnimation'

interface CycleDiagramProps {
  label?: string
  trigger?: string
  states: Array<{ text: string; sub?: string }>
}

/**
 * 循環図 — 円形配置で状態遷移を視覚表現
 * 各状態を円周上に配置し、矢印で循環を示す。
 */
export function CycleDiagram({ label, trigger, states }: CycleDiagramProps) {
  const { containerRef, isVisible, getItemDelay } = useDiagramAnimation({
    itemCount: states.length,
  })

  if (states.length === 0) return null

  // Colors for each state
  const colors = [
    'border-claude-orange/40 bg-claude-orange/10',
    'border-blue-300 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10',
    'border-green-300 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10',
    'border-purple-300 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10',
  ]

  return (
    <div ref={containerRef} aria-label={label ?? '循環図'}>
      {label && (
        <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
      )}

      {/* Circular layout using SVG for arrows + positioned divs */}
      <div className="relative mx-auto" style={{ width: 220, height: 180 }}>
        {/* Center cycle arrow SVG */}
        <svg
          className="absolute inset-0"
          width="220" height="180" viewBox="0 0 220 180"
          aria-hidden="true"
          style={{ opacity: isVisible ? 0.4 : 0, transition: 'opacity 0.5s' }}
        >
          {/* Circular arrow path */}
          <path
            d="M 110 30 A 70 60 0 1 1 105 30"
            fill="none"
            stroke="#D97757"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <polygon points="110,25 115,33 105,33" fill="#D97757" />
        </svg>

        {/* State nodes positioned around the circle */}
        {states.map((state, i) => {
          const total = states.length
          const angle = (i / total) * Math.PI * 2 - Math.PI / 2
          const cx = 110 + Math.cos(angle) * 75
          const cy = 90 + Math.sin(angle) * 60

          return (
            <div
              key={i}
              className={`absolute rounded-xl border px-2.5 py-1.5 text-center transition-none ${colors[i % colors.length]} ${
                isVisible ? 'animate-diagram-scale-in' : 'opacity-0'
              }`}
              style={{
                left: cx,
                top: cy,
                transform: 'translate(-50%, -50%)',
                animationDelay: getItemDelay(i),
                minWidth: 60,
              }}
            >
              <div className="text-[11px] font-semibold text-claude-dark">{state.text}</div>
              {state.sub && (
                <div className="text-[9px] text-stone-400 dark:text-stone-500">{state.sub}</div>
              )}
            </div>
          )
        })}
      </div>

      {trigger && (
        <p className="mt-1 text-center text-[10px] text-stone-400 dark:text-stone-500">
          <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-stone-600 dark:bg-stone-700 dark:text-stone-300">
            {trigger}
          </code>
          {' '}で切り替え
        </p>
      )}
    </div>
  )
}
