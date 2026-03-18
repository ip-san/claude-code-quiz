import { useDiagramAnimation } from './useDiagramAnimation'

interface FlowDiagramProps {
  label?: string
  steps: Array<{ text: string; sub?: string }>
}

export function FlowDiagram({ label, steps }: FlowDiagramProps) {
  const { containerRef, isVisible, getItemDelay } = useDiagramAnimation({
    itemCount: steps.length,
  })

  return (
    <div ref={containerRef} aria-label={label ?? 'フロー図'}>
      {label && (
        <p className="mb-2 text-xs font-medium text-stone-500">{label}</p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1">
            {/* Arrow before (except first) */}
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
            {/* Step block */}
            <div
              className={`flex-shrink-0 rounded-lg border px-2.5 py-1.5 text-center transition-none ${
                i === 0
                  ? 'border-claude-orange/40 bg-claude-orange/10'
                  : 'border-stone-200 bg-stone-50'
              } ${isVisible ? 'animate-diagram-slide-right' : 'opacity-0'}`}
              style={{ animationDelay: getItemDelay(i) }}
            >
              <div className="text-xs font-medium text-claude-dark">
                {step.text}
              </div>
              {step.sub && (
                <div className="text-[10px] text-stone-400">{step.sub}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
