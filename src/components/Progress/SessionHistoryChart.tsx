import type { SessionRecord } from '@/domain/entities/UserProgress'

interface SessionHistoryChartProps {
  sessions: readonly SessionRecord[]
}

const CHART_WIDTH = 600
const CHART_HEIGHT = 200
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 }

const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom

/**
 * SessionHistoryChart - セッション履歴折れ線グラフ（SVG）
 *
 * 直近20セッションの正答率を折れ線グラフで表示。
 * npm依存なし、SVG直書きで軽量。
 */
export function SessionHistoryChart({ sessions }: SessionHistoryChartProps) {
  // Recalculate on each render to react to theme changes (no stale cache)
  const isDark = document.documentElement.classList.contains('dark')
  const gridColor = isDark ? '#444' : '#e7e5e4'
  const dotStroke = isDark ? '#2a2a2a' : 'white'

  if (sessions.length < 2) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
        <p className="text-sm text-stone-400">
          グラフを表示するには2回以上のセッションが必要です
        </p>
      </div>
    )
  }

  const recent = sessions.slice(-20)
  const maxY = 100
  const minY = 0

  const points = recent.map((s, i) => ({
    x: PADDING.left + (i / (recent.length - 1)) * INNER_WIDTH,
    y: PADDING.top + INNER_HEIGHT - ((s.percentage - minY) / (maxY - minY)) * INNER_HEIGHT,
    percentage: s.percentage,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  // Area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${PADDING.top + INNER_HEIGHT} L ${points[0].x} ${PADDING.top + INNER_HEIGHT} Z`

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100]

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-claude-dark">学習推移</h3>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="セッション正答率の推移グラフ"
      >
        {/* Grid lines */}
        {yLabels.map((v) => {
          const y = PADDING.top + INNER_HEIGHT - (v / 100) * INNER_HEIGHT
          return (
            <g key={v}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + INNER_WIDTH}
                y2={y}
                stroke={gridColor}
                strokeDasharray={v === 0 ? undefined : '4,4'}
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-stone-400 text-[10px]"
              >
                {v}%
              </text>
            </g>
          )
        })}

        {/* 70% passing line */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + INNER_HEIGHT - (70 / 100) * INNER_HEIGHT}
          x2={PADDING.left + INNER_WIDTH}
          y2={PADDING.top + INNER_HEIGHT - (70 / 100) * INNER_HEIGHT}
          stroke="#D97757"
          strokeDasharray="6,3"
          strokeWidth={1}
          opacity={0.5}
        />

        {/* Area fill */}
        <path d={areaD} fill="#D97757" opacity={0.1} />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#D97757" strokeWidth={2} />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#D97757"
            stroke={dotStroke}
            strokeWidth={1.5}
          >
            <title>{`セッション${i + 1}: ${p.percentage}%`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-stone-400">
        <span>過去</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-4 bg-claude-orange opacity-50" style={{ borderTop: '1px dashed #D97757' }} />
          合格ライン(70%)
        </span>
        <span>最新</span>
      </div>
    </div>
  )
}
