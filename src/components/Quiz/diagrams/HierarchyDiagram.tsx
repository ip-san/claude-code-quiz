import { useDiagramAnimation } from './useDiagramAnimation'

interface HierarchyDiagramProps {
  label?: string
  items: Array<{ text: string; sub?: string }>
}

/**
 * 階層図 — ピラミッド型で優先度を視覚表現
 * 上ほど幅が狭く優先度が高い。色グラデーションで重要度を示す。
 */
export function HierarchyDiagram({ label, items }: HierarchyDiagramProps) {
  const { containerRef, isVisible, getItemDelay } = useDiagramAnimation({
    itemCount: items.length,
  })

  // Color gradient: top (most important) is orange, bottom fades to gray
  const getColor = (index: number, total: number) => {
    if (index === 0) return { bg: 'bg-claude-orange/15', border: 'border-claude-orange/40', text: 'text-claude-orange' }
    const ratio = index / (total - 1)
    if (ratio < 0.5)
      return {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-300',
      }
    return {
      bg: 'bg-stone-50 dark:bg-stone-800',
      border: 'border-stone-200 dark:border-stone-700',
      text: 'text-stone-600 dark:text-stone-400',
    }
  }

  return (
    <div ref={containerRef} aria-label={label ?? '階層図'}>
      {label && <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>}
      <div className="flex flex-col items-center gap-0.5">
        {items.map((item, i) => {
          const color = getColor(i, items.length)
          // Pyramid: width narrows at top (reversed: top=narrow=high priority)
          const widthPercent = 50 + (i / Math.max(items.length - 1, 1)) * 50

          return (
            <div key={i} className="flex w-full flex-col items-center">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className="h-2 w-px bg-stone-300 dark:bg-stone-600"
                  style={{ opacity: isVisible ? 1 : 0, animationDelay: getItemDelay(i) }}
                  aria-hidden="true"
                />
              )}
              {/* Item — trapezoid feel via variable width */}
              <div
                className={`rounded-lg border px-3 py-1.5 text-center transition-none ${color.bg} ${color.border} ${
                  isVisible ? 'animate-diagram-scale-in' : 'opacity-0'
                }`}
                style={{ width: `${widthPercent}%`, animationDelay: getItemDelay(i) }}
              >
                <span className={`text-xs font-semibold ${i === 0 ? 'text-claude-orange' : color.text}`}>
                  {item.text}
                </span>
                {item.sub && <span className="ml-1.5 text-[10px] text-stone-500 dark:text-stone-500">{item.sub}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {/* Priority indicator */}
      <div
        className="mt-1.5 flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-500"
        aria-hidden="true"
      >
        <span>▲ 高優先</span>
        <span>低優先 ▼</span>
      </div>
    </div>
  )
}
