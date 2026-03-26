import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { CATEGORY_EDGES, CATEGORY_POSITIONS } from '@/data/categoryRelationships'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { headerStyles, pageStyles } from '@/lib/styles'
import { useQuizStore } from '@/stores/quizStore'

function getAccuracyColor(accuracy: number, attempted: boolean): string {
  if (!attempted) return '#9CA3AF' // gray
  if (accuracy >= 80) return '#10B981' // emerald
  if (accuracy >= 50) return '#F59E0B' // amber
  return '#EF4444' // red
}

function getNodeRadius(attemptedRatio: number): number {
  return 24 + attemptedRatio * 12 // 24-36px
}

export function KnowledgeMap() {
  const { getCategoryStats, endSession, startSession, allQuestions } = useQuizStore()
  const stats = getCategoryStats()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const handleCategoryTap = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId)
  }

  const handleStartQuiz = (categoryId: string) => {
    startSession({ mode: 'category', categoryFilter: categoryId })
  }

  const selectedStats = selectedCategory ? stats[selectedCategory] : null
  const selectedCat = selectedCategory ? PREDEFINED_CATEGORIES.find((c) => c.id === selectedCategory) : null
  const totalForCategory = selectedCategory ? allQuestions.filter((q) => q.category === selectedCategory).length : 0

  return (
    <div className={`min-h-screen ${pageStyles.cream}`}>
      {/* Header */}
      <div className={headerStyles.sticky}>
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            <button onClick={endSession} className="tap-highlight rounded-full p-1" aria-label="戻る">
              <ArrowLeft className="h-5 w-5 text-stone-600 dark:text-stone-300" />
            </button>
            <h1 className="text-lg font-bold text-claude-dark">知識マップ</h1>
          </div>
        </div>
      </div>

      {/* SVG Map */}
      <div className="mx-auto max-w-md px-4 pt-2">
        <svg viewBox="0 0 300 360" className="w-full" role="img" aria-label="カテゴリ間の関連を示す知識マップ">
          {/* Edges */}
          {CATEGORY_EDGES.map((edge) => {
            const from = CATEGORY_POSITIONS[edge.from]
            const to = CATEGORY_POSITIONS[edge.to]
            if (!from || !to) return null
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                className="text-stone-300 dark:text-stone-600"
                opacity={0.6}
              />
            )
          })}

          {/* Nodes */}
          {PREDEFINED_CATEGORIES.map((cat) => {
            const pos = CATEGORY_POSITIONS[cat.id]
            if (!pos) return null
            const s = stats[cat.id]
            const attempted = (s?.attemptedQuestions ?? 0) > 0
            const accuracy = s?.accuracy ?? 0
            const total = allQuestions.filter((q) => q.category === cat.id).length
            const attemptedRatio = total > 0 ? (s?.attemptedQuestions ?? 0) / total : 0
            const r = getNodeRadius(attemptedRatio)
            const color = getAccuracyColor(accuracy, attempted)
            const isSelected = selectedCategory === cat.id

            return (
              <g
                key={cat.id}
                onClick={() => handleCategoryTap(cat.id)}
                className="cursor-pointer"
                role="button"
                aria-label={`${cat.name}: 正答率${attempted ? accuracy + '%' : '未回答'}`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCategoryTap(cat.id)}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={r + 4} fill="none" stroke={color} strokeWidth={2.5} opacity={0.6} />
                )}
                {/* Node circle */}
                <circle cx={pos.x} cy={pos.y} r={r} fill={color} opacity={attempted ? 0.85 : 0.3} />
                {/* Icon */}
                <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="central" fontSize="16">
                  {cat.icon}
                </text>
                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + r + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={isSelected ? 700 : 500}
                  className="fill-stone-700 dark:fill-stone-300"
                >
                  {cat.name}
                </text>
                {/* Accuracy badge */}
                {attempted && (
                  <text
                    x={pos.x}
                    y={pos.y + r + 24}
                    textAnchor="middle"
                    fontSize="8"
                    className="fill-stone-500 dark:fill-stone-400"
                  >
                    {accuracy}%
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail sheet */}
      {selectedCat && selectedStats && (
        <div className="mx-auto max-w-md px-4 pb-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-800">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl">{selectedCat.icon}</span>
              <h2 className="text-lg font-bold text-claude-dark">{selectedCat.name}</h2>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold text-claude-dark">{selectedStats.accuracy}%</div>
                <div className="text-xs text-stone-500">正答率</div>
              </div>
              <div>
                <div className="text-xl font-bold text-claude-dark">{selectedStats.attemptedQuestions}</div>
                <div className="text-xs text-stone-500">回答済み</div>
              </div>
              <div>
                <div className="text-xl font-bold text-claude-dark">{totalForCategory}</div>
                <div className="text-xs text-stone-500">全問題数</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
              <div
                className="h-full rounded-full bg-claude-orange transition-all"
                style={{
                  width: `${totalForCategory > 0 ? (selectedStats.attemptedQuestions / totalForCategory) * 100 : 0}%`,
                }}
              />
            </div>

            <button
              onClick={() => handleStartQuiz(selectedCategory!)}
              className="tap-highlight w-full rounded-xl bg-claude-orange py-3 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
            >
              このカテゴリを学習
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mx-auto flex max-w-md items-center justify-center gap-4 px-4 py-4 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          80%+
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          50-79%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          &lt;50%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-gray-400 opacity-30" />
          未回答
        </span>
      </div>
    </div>
  )
}
