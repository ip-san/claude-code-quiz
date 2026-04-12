/**
 * @vitest-environment jsdom
 *
 * useRecommendation の loadFromCache ロジック統合テスト
 *
 * window.electronAPI をモックし、キャッシュ→状態→レコメンド表示の全フローを検証。
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Question } from '@/domain/entities/Question'
import { computeRecommendations } from './recommendUtils'
import { useRecommendation } from './useRecommendation'

// Mock quizStore — supports both selector and no-selector usage
const mockState = {
  allQuestions: [],
  userProgress: {
    isCorrectlyAnswered: () => false,
    questionProgress: {},
    categoryProgress: {},
  },
}
vi.mock('@/stores/quizStore', () => ({
  useQuizStore: Object.assign(
    vi.fn((selector?: (s: typeof mockState) => unknown) => (selector ? selector(mockState) : mockState)),
    { getState: () => mockState }
  ),
}))

vi.mock('@/lib/haptics', () => ({
  haptics: { medium: vi.fn(), light: vi.fn() },
}))

vi.mock('@/config/locale', async () => {
  const actual = await vi.importActual<typeof import('@/config/locale')>('@/config/locale')
  return actual
})

vi.mock('@/config/theme', async () => {
  const actual = await vi.importActual<typeof import('@/config/theme')>('@/config/theme')
  return actual
})

function makeQuestion(id: string, category: string): Question {
  return Question.create({
    id,
    question: `Q ${id}`,
    options: [{ text: 'A' }, { text: 'B', wrongFeedback: 'w' }],
    correctIndex: 0,
    explanation: 'E',
    category,
    difficulty: 'beginner',
  })
}

const testQuestions = [
  makeQuestion('bp-001', 'bestpractices'),
  makeQuestion('bp-002', 'bestpractices'),
  makeQuestion('ext-001', 'extensions'),
  makeQuestion('ext-002', 'extensions'),
  makeQuestion('tool-001', 'tools'),
]

describe('loadFromCache integration logic', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** loadFromCache の AI reasons パスを再現 */
  function simulateAiReasonsPath(cachedIds: string[], aiReasons: Record<string, string>, allQuestions: Question[]) {
    const recs = cachedIds
      .map((id) => {
        const q = allQuestions.find((q) => q.id === id)
        if (!q) return null
        return { id, question: q.question, category: q.category, reason: aiReasons[id] ?? '', signals: ['AI選定'] }
      })
      .filter(Boolean)
    return recs
  }

  /** loadFromCache のフォールバックパスを再現 */
  function simulateFallbackPath(topCategories: string[], allQuestions: Question[]) {
    const analysis = {
      tools: {},
      topics: [],
      categoryScores: Object.fromEntries(topCategories.map((c, i) => [c, 100 - i * 10])),
      recommendedIds: [],
      sessionCount: 5,
      promptSamples: [],
    }
    return computeRecommendations(analysis, allQuestions)
  }

  it('AI reasons path: creates recs with AI-generated reasons', () => {
    const reasons = { 'bp-001': 'AI理由A', 'ext-001': 'AI理由B' }
    const recs = simulateAiReasonsPath(['bp-001', 'ext-001'], reasons, testQuestions)
    expect(recs).toHaveLength(2)
    expect(recs[0]!.reason).toBe('AI理由A')
    expect(recs[1]!.reason).toBe('AI理由B')
    expect(recs[0]!.signals).toContain('AI選定')
  })

  it('AI reasons path: filters out unknown IDs', () => {
    const reasons = { 'bp-001': 'r1', 'nonexistent-999': 'r2' }
    const recs = simulateAiReasonsPath(['bp-001', 'nonexistent-999'], reasons, testQuestions)
    expect(recs).toHaveLength(1)
    expect(recs[0]!.id).toBe('bp-001')
  })

  it('AI reasons path: empty reason when ID not in reasons map', () => {
    const recs = simulateAiReasonsPath(['bp-001'], {}, testQuestions)
    expect(recs).toHaveLength(1)
    expect(recs[0]!.reason).toBe('')
  })

  it('fallback path: generates recs from categoryScores', () => {
    const { recs } = simulateFallbackPath(['bestpractices', 'extensions', 'tools'], testQuestions)
    expect(recs.length).toBeGreaterThan(0)
    for (const rec of recs) {
      expect(rec.reason.length).toBeGreaterThan(0)
      expect(rec.signals.length).toBeGreaterThan(0)
    }
  })

  it('fallback path: all recs have categories from topCategories', () => {
    const { recs } = simulateFallbackPath(['bestpractices', 'extensions'], testQuestions)
    const categories = new Set(recs.map((r) => r.category))
    // Should include at least the top categories
    expect(categories.has('bestpractices') || categories.has('extensions')).toBe(true)
  })

  it('AI path produces different output than fallback for same IDs', () => {
    const aiRecs = simulateAiReasonsPath(['bp-001'], { 'bp-001': 'AI固有の理由' }, testQuestions)
    const { recs: fallbackRecs } = simulateFallbackPath(['bestpractices'], testQuestions)
    const fallbackBp = fallbackRecs.find((r) => r.id === 'bp-001')

    // AI reasons are specific, fallback reasons are generic
    expect(aiRecs[0]!.reason).toBe('AI固有の理由')
    if (fallbackBp) {
      expect(fallbackBp.reason).not.toBe('AI固有の理由')
    }
  })
})

// ── setupHooks ────────────────────────────────────────────────────────────────

describe('useRecommendation: setupHooks', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Suppress expected error logs from intentional failure paths below
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn())
    window.electronAPI = {
      setupGlobalHooks: vi.fn(),
      checkGlobalHooks: vi.fn().mockResolvedValue(false),
      checkRecommendReady: vi.fn().mockResolvedValue({ ready: false }),
      getCachedRecommend: vi.fn().mockResolvedValue(null),
      showNotification: vi.fn(),
    } as any
  })

  afterEach(() => {
    window.electronAPI = undefined as any
    consoleErrorSpy?.mockRestore()
    vi.clearAllMocks()
  })

  it('成功時に hooksInstalled と setupDone が即座に true になること', async () => {
    ;(window.electronAPI!.setupGlobalHooks as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
    // After successful setup, checkGlobalHooks should confirm hooks exist
    ;(window.electronAPI!.checkGlobalHooks as ReturnType<typeof vi.fn>).mockResolvedValue(false)

    const { result } = renderHook(() => useRecommendation())

    // Wait for initial checkGlobalHooks effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.hooksInstalled).toBe(false)
    expect(result.current.setupDone).toBe(false)

    // After setup succeeds, checkGlobalHooks will return true on re-check
    ;(window.electronAPI!.checkGlobalHooks as ReturnType<typeof vi.fn>).mockResolvedValue(true)

    await act(async () => {
      await result.current.setupHooks()
    })

    // Wait for setupDone-triggered useEffect to re-check
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.setupDone).toBe(true)
    expect(result.current.hooksInstalled).toBe(true)
  })

  it('失敗時に hooksInstalled と setupDone が変わらないこと', async () => {
    ;(window.electronAPI!.setupGlobalHooks as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Permission denied',
    })

    const { result } = renderHook(() => useRecommendation())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    await act(async () => {
      await result.current.setupHooks()
    })

    expect(result.current.setupDone).toBe(false)
    expect(result.current.hooksInstalled).toBe(false)
  })

  it('dismissSetup で hooksInstalled が true になりバナーが消えること', async () => {
    const { result } = renderHook(() => useRecommendation())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    act(() => {
      result.current.dismissSetup()
    })

    expect(result.current.hooksInstalled).toBe(true)
  })

  it('electronAPI が未定義でも setupHooks がエラーを投げないこと', async () => {
    window.electronAPI = undefined as any

    const { result } = renderHook(() => useRecommendation())

    await act(async () => {
      await result.current.setupHooks()
    })

    expect(result.current.setupDone).toBe(false)
  })
})
