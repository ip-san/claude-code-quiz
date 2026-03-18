import { useDiagramAnimation } from './useDiagramAnimation'

interface ComparisonDiagramProps {
  label?: string
  columns: Array<{ heading: string; items: string[] }>
}

export function ComparisonDiagram({ label, columns }: ComparisonDiagramProps) {
  const { containerRef, isVisible, getItemDelay } = useDiagramAnimation({
    itemCount: columns.length,
    staggerMs: 150,
  })

  return (
    <div ref={containerRef} aria-label={label ?? '比較図'}>
      {label && (
        <p className="mb-2 text-xs font-medium text-stone-500">{label}</p>
      )}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((col, i) => (
          <div
            key={i}
            className={`rounded-lg border border-stone-200 transition-none ${
              isVisible ? 'animate-diagram-fade-up' : 'opacity-0'
            }`}
            style={{ animationDelay: getItemDelay(i) }}
          >
            {/* Column header */}
            <div className={`rounded-t-lg px-2 py-1.5 text-center text-xs font-medium ${
              i === 0
                ? 'bg-claude-orange/10 text-claude-dark'
                : 'bg-stone-100 text-claude-dark'
            }`}>
              {col.heading}
            </div>
            {/* Column items */}
            <ul className="px-2 py-1.5">
              {col.items.map((item, j) => (
                <li key={j} className="flex items-start gap-1 text-[10px] leading-relaxed text-stone-600">
                  <span className="mt-0.5 text-stone-400" aria-hidden="true">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
