import { useDiagramAnimation } from './useDiagramAnimation'

interface HierarchyDiagramProps {
  label?: string
  items: Array<{ text: string; sub?: string }>
}

export function HierarchyDiagram({ label, items }: HierarchyDiagramProps) {
  const { containerRef, isVisible, getItemDelay } = useDiagramAnimation({
    itemCount: items.length,
  })

  return (
    <div ref={containerRef} aria-label={label ?? '階層図'}>
      {label && (
        <p className="mb-2 text-xs font-medium text-stone-500">{label}</p>
      )}
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i}>
            {/* Arrow between items */}
            {i > 0 && (
              <div
                className="flex justify-center py-0.5"
                aria-hidden="true"
                style={{
                  opacity: isVisible ? 1 : 0,
                  animationDelay: getItemDelay(i),
                }}
              >
                <svg width="12" height="10" viewBox="0 0 12 10" className="text-stone-400">
                  <path d="M6 0 L6 6 M3 4 L6 7 L9 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            {/* Item block */}
            <div
              className={`rounded-lg border px-3 py-1.5 text-center transition-none ${
                i === 0
                  ? 'border-claude-orange/40 bg-claude-orange/10'
                  : 'border-stone-200 bg-stone-50'
              } ${isVisible ? 'animate-diagram-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: getItemDelay(i) }}
            >
              <span className="text-xs font-medium text-claude-dark">
                {item.text}
              </span>
              {item.sub && (
                <span className="ml-1.5 text-xs text-stone-400">
                  {item.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Priority indicator */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400" aria-hidden="true">
        <span>高優先</span>
        <span>低優先</span>
      </div>
    </div>
  )
}
