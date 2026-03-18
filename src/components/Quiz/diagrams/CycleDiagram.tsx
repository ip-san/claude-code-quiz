import { useDiagramAnimation } from './useDiagramAnimation'

interface CycleDiagramProps {
  label?: string
  trigger?: string
  states: Array<{ text: string; sub?: string }>
}

export function CycleDiagram({ label, trigger, states }: CycleDiagramProps) {
  const { containerRef, isVisible, getItemDelay } = useDiagramAnimation({
    itemCount: states.length,
  })

  return (
    <div ref={containerRef} aria-label={label ?? '循環図'}>
      {label && (
        <p className="mb-2 text-xs font-medium text-stone-500">{label}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {states.map((state, i) => (
          <div key={i} className="flex items-center gap-1">
            {/* Arrow between states */}
            {i > 0 && (
              <svg
                width="16" height="12" viewBox="0 0 16 12"
                className="flex-shrink-0 text-stone-400"
                aria-hidden="true"
                style={{
                  opacity: isVisible ? 1 : 0,
                  animationDelay: getItemDelay(i),
                }}
              >
                <path d="M0 6 L10 6 M8 3 L11 6 L8 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {/* State block */}
            <div
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-center transition-none ${
                i === 0
                  ? 'border-claude-orange/40 bg-claude-orange/10'
                  : 'border-stone-200 bg-stone-50'
              } ${isVisible ? 'animate-diagram-scale-in' : 'opacity-0'}`}
              style={{ animationDelay: getItemDelay(i) }}
            >
              <div className="text-xs font-medium text-claude-dark">
                {state.text}
              </div>
              {state.sub && (
                <div className="text-[10px] text-stone-400">{state.sub}</div>
              )}
            </div>
          </div>
        ))}
        {/* Return arrow (cycle back to first) */}
        <svg
          width="16" height="12" viewBox="0 0 16 12"
          className="flex-shrink-0 text-claude-orange/60"
          aria-hidden="true"
          style={{
            opacity: isVisible ? 1 : 0,
            animationDelay: getItemDelay(states.length),
          }}
        >
          <path d="M0 6 L10 6 M8 3 L11 6 L8 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* "repeat" indicator */}
        <div
          className={`rounded-full border border-dashed border-claude-orange/30 px-2 py-1 text-[10px] text-claude-orange transition-none ${
            isVisible ? 'animate-diagram-scale-in' : 'opacity-0'
          }`}
          style={{ animationDelay: getItemDelay(states.length) }}
          aria-hidden="true"
        >
          ...
        </div>
      </div>
      {trigger && (
        <p className="mt-2 text-center text-[10px] text-stone-400">
          <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-stone-600">
            {trigger}
          </code>
          {' '}で切り替え
        </p>
      )}
    </div>
  )
}
