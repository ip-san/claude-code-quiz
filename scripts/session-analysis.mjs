/**
 * collect-session.mjs から抽出した純粋関数群。
 * ファイル I/O に依存せず、テスタブル。
 */

import { CATEGORY_KEYWORDS, TOPIC_KEYWORDS } from './topic-config.mjs'

// ── JSONL Parsing ──────────────────────────────────────────

/**
 * JSONL コンテンツ文字列をパースし、ツール使用・プロンプト・会話フローを抽出する。
 * @param {string} content - JSONL ファイルの内容
 * @returns {{ tools: Record<string, number>, prompts: string[], conversations: Array<{seq: number, role: string, text: string, toolsUsed?: string[], hasError?: boolean}> }}
 */
export function parseJsonlContent(content) {
  const lines = content.split('\n').filter(Boolean)
  const tools = {}
  const prompts = []
  const conversations = []
  let promptIndex = 0

  for (const line of lines) {
    try {
      const j = JSON.parse(line)

      // User messages
      if (j.type === 'user' && j.message?.content) {
        const text =
          typeof j.message.content === 'string'
            ? j.message.content
            : j.message.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join(' ')
        if (text.length > 5) {
          prompts.push(text)
          promptIndex++
          conversations.push({ seq: promptIndex, role: 'user', text })
        }
      }

      // Assistant messages
      if (j.message?.role === 'assistant' && j.message?.content && Array.isArray(j.message.content)) {
        let responseText = ''
        const toolsUsed = []
        let hasError = false

        for (const c of j.message.content) {
          if (c.type === 'text' && c.text) responseText += c.text
          if (c.type === 'tool_use') {
            tools[c.name] = (tools[c.name] || 0) + 1
            toolsUsed.push(c.name)
            if (c.input?.command) prompts.push(c.input.command)
          }
          if (c.type === 'tool_result' && c.is_error) hasError = true
        }

        if (responseText.length > 0 || toolsUsed.length > 0) {
          const summary = responseText.slice(0, 120) || `[ツール: ${toolsUsed.slice(0, 3).join(', ')}]`
          conversations.push({
            seq: promptIndex,
            role: 'assistant',
            text: summary,
            toolsUsed: toolsUsed.length > 0 ? toolsUsed.slice(0, 5) : undefined,
            hasError: hasError || undefined,
          })
        }
      }

      // Tool results (error propagation)
      if (j.type === 'tool_result' || j.message?.role === 'tool') {
        const isError = j.is_error || j.message?.is_error
        if (isError && conversations.length > 0) {
          const last = conversations[conversations.length - 1]
          if (last.role === 'assistant') last.hasError = true
        }
      }
    } catch {
      /* skip malformed lines */
    }
  }
  return { tools, prompts, conversations }
}

// ── Category Scoring ───────────────────────────────────────

/**
 * プロンプト群からカテゴリスコアを算出する。
 * @param {string[]} prompts
 * @returns {Record<string, number>}
 */
export function scoreCategories(prompts) {
  const allText = prompts.join(' ')
  const categoryScores = {}
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    categoryScores[cat] = keywords.reduce((score, kw) => {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return score + (allText.match(regex) || []).length
    }, 0)
  }
  return categoryScores
}

// ── Transcript Analysis ────────────────────────────────────

const COMMAND_PREFIX_PATTERN =
  /^(node |git |ls |cat |grep |rg |bun |npm |npx |docker |curl |wget |ssh |cd |mkdir |rm |mv |cp |tail |head |sed |awk |kill |pkill |lsof |stat |wc |chmod |chown |tar |find |sleep |echo |printf |make |pip |python3? )/

/**
 * JSONL コンテンツからトランスクリプト分析結果を生成する。
 * @param {string} content - JSONL ファイルの内容
 */
export function analyzeTranscriptContent(content) {
  const { tools, prompts, conversations } = parseJsonlContent(content)
  const categoryScores = scoreCategories(prompts)
  const allText = prompts.join(' ').toLowerCase()

  // Detect topics
  const topics = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const hits = keywords.filter((kw) => allText.includes(kw.toLowerCase())).length
    if (hits >= 1) topics.push({ topic, hits })
  }

  // Prompt samples (filtered)
  const promptSamples = prompts
    .filter(
      (p) =>
        p.length > 10 &&
        p.length < 200 &&
        !COMMAND_PREFIX_PATTERN.test(p) &&
        !p.includes('<command-') &&
        !p.includes('<local-command') &&
        !p.includes('</') &&
        !/^[!/]/.test(p) &&
        !/^\(cd |^2>&1/.test(p) &&
        !/^[A-Z_]+=/.test(p)
    )
    .map((p) => p.trim())
    .slice(-20)

  // Struggle signals (deterministic detection)
  const meaningful = prompts.filter(
    (p) => p.length > 10 && !p.startsWith('node ') && !p.startsWith('git ') && !/^[!/]/.test(p)
  )

  const lengthRatio =
    meaningful.length >= 4
      ? (() => {
          const half = Math.floor(meaningful.length / 2)
          const frontAvg = meaningful.slice(0, half).reduce((s, p) => s + p.length, 0) / half
          const backAvg = meaningful.slice(half).reduce((s, p) => s + p.length, 0) / (meaningful.length - half)
          return frontAvg > 0 ? Math.round((backAvg / frontAvg) * 100) / 100 : 1
        })()
      : 1

  // Detect repeated prompts (same text 3+ times = strong struggle)
  const promptCounts = new Map()
  for (const p of meaningful) {
    const key = p.slice(0, 60).toLowerCase()
    promptCounts.set(key, (promptCounts.get(key) || 0) + 1)
  }
  const repeatedCount = [...promptCounts.values()].filter((c) => c >= 3).length

  // Detect consecutive errors
  let maxConsecutiveErrors = 0
  let currentErrors = 0
  for (const c of conversations) {
    if (c.hasError) {
      currentErrors++
      maxConsecutiveErrors = Math.max(maxConsecutiveErrors, currentErrors)
    } else if (c.role === 'user') {
      currentErrors = 0
    }
  }

  // Detect frustration keywords
  const frustrationKeywords =
    /なぜ|どうして|違う|おかしい|壊れ|動かない|エラー|失敗|ダメ|うまくいかない|wrong|broken|doesn't work|failed|error/i
  const frustrationHits = meaningful.filter((p) => frustrationKeywords.test(p)).length

  // Detect session reset signals (/clear, /compact frequency)
  const resetSignals = prompts.filter((p) => /^\/(clear|compact|rewind)/.test(p)).length

  // Compute overall struggle level
  let struggleLevel = 'none'
  if (repeatedCount >= 1 || maxConsecutiveErrors >= 3 || frustrationHits >= 3) {
    struggleLevel = 'strong'
  } else if (maxConsecutiveErrors >= 2 || frustrationHits >= 1 || lengthRatio >= 1.8 || resetSignals >= 2) {
    struggleLevel = 'mild'
  }

  const struggleSignals = {
    promptCount: meaningful.length,
    lengthRatio,
    repeatedPrompts: repeatedCount,
    consecutiveErrors: maxConsecutiveErrors,
    frustrationHits,
    resetSignals,
    level: struggleLevel,
  }

  return { tools, categoryScores, topics, promptSamples, promptCount: prompts.length, conversations, struggleSignals }
}

// ── Daily Session Merge ────────────────────────────────────

/**
 * 複数セッションの分析結果をマージする。
 * @param {Array} sessions - analyzeTranscriptContent の結果配列
 * @returns {{ tools: Record<string, number>, categoryScores: Record<string, number>, topics: Array<{topic: string, hits: number}>, promptSamples: string[], struggleSignals: {promptCount: number, lengthRatio: number} }}
 */
export function mergeDailySessions(sessions) {
  const merged = { tools: {}, categoryScores: {}, topics: {}, promptSamples: [] }

  for (const sess of sessions) {
    for (const [tool, count] of Object.entries(sess.tools)) {
      merged.tools[tool] = (merged.tools[tool] || 0) + count
    }
    for (const [cat, score] of Object.entries(sess.categoryScores)) {
      merged.categoryScores[cat] = (merged.categoryScores[cat] || 0) + score
    }
    for (const t of sess.topics) {
      merged.topics[t.topic] = Math.max(merged.topics[t.topic] || 0, t.hits)
    }
    merged.promptSamples.push(...(sess.promptSamples || []).slice(-10))
  }

  // Aggregate struggle signals
  let totalPromptCount = 0
  let totalLengthRatio = 0
  let ratioCount = 0
  let totalRepeated = 0
  let maxErrors = 0
  let totalFrustration = 0
  let totalResets = 0
  for (const sess of sessions) {
    if (sess.struggleSignals) {
      totalPromptCount += sess.struggleSignals.promptCount || 0
      if (sess.struggleSignals.lengthRatio !== 1) {
        totalLengthRatio += sess.struggleSignals.lengthRatio
        ratioCount++
      }
      totalRepeated += sess.struggleSignals.repeatedPrompts || 0
      maxErrors = Math.max(maxErrors, sess.struggleSignals.consecutiveErrors || 0)
      totalFrustration += sess.struggleSignals.frustrationHits || 0
      totalResets += sess.struggleSignals.resetSignals || 0
    }
  }

  const avgLengthRatio = ratioCount > 0 ? Math.round((totalLengthRatio / ratioCount) * 100) / 100 : 1
  let mergedLevel = 'none'
  if (totalRepeated >= 1 || maxErrors >= 3 || totalFrustration >= 3) mergedLevel = 'strong'
  else if (maxErrors >= 2 || totalFrustration >= 1 || avgLengthRatio >= 1.8 || totalResets >= 2) mergedLevel = 'mild'

  return {
    tools: merged.tools,
    categoryScores: merged.categoryScores,
    topics: Object.entries(merged.topics)
      .map(([topic, hits]) => ({ topic, hits }))
      .sort((a, b) => b.hits - a.hits),
    promptSamples: merged.promptSamples.slice(-30),
    struggleSignals: {
      promptCount: totalPromptCount,
      lengthRatio: avgLengthRatio,
      repeatedPrompts: totalRepeated,
      consecutiveErrors: maxErrors,
      frustrationHits: totalFrustration,
      resetSignals: totalResets,
      level: mergedLevel,
    },
  }
}

// ── Rolling 7-day Cache ────────────────────────────────────

/**
 * 日次データから7日ローリングキャッシュを構築する。
 * @param {Array<{dateStr: string, dayIndex: number, dayData: {sessions: Array, merged: {categoryScores: Record<string, number>, topics: Array<{topic: string, hits: number}>}}}>} entries
 * @returns {{ days: string[], sessionCount: number, prompts: string[], conversationFlows: Array, topics: Array<{topic: string, hits: number}>, categoryScores: Record<string, number>, struggleSignals: {promptCount: number, lengthRatio: number} }}
 */
export function buildRollingCacheData(entries) {
  const cache = {
    days: [],
    sessionCount: 0,
    prompts: [],
    conversationFlows: [],
    topics: {},
    categoryScores: {},
    struggleSignals: { promptCount: 0, lengthRatio: 1 },
  }

  const commandPrefixes =
    /^(docker |npm |bun |node |npx |git |tail |sleep |rm |kill |pkill |cat |grep |ls |cd |mkdir |sed |awk |curl |wget |ssh )/

  for (const { dateStr, dayIndex, dayData } of entries) {
    const weight = dayIndex === 0 ? 1.0 : 0.7 - dayIndex * 0.08
    cache.days.push(dateStr)
    cache.sessionCount += dayData.sessions.length

    for (const sess of dayData.sessions) {
      if (sess.promptSamples?.length > 0) {
        const meaningful = sess.promptSamples.filter((p) => p.length > 10 && !commandPrefixes.test(p))
        cache.prompts.push(...meaningful)
      }
    }

    for (const sess of dayData.sessions) {
      if (sess.conversations?.length > 0) {
        cache.conversationFlows.push({
          date: dateStr,
          sessionId: sess.id,
          prompts: sess.conversations.slice(-20).map((c) => ({
            role: c.role || 'user',
            text: (c.text || '').slice(0, 120),
            hasError: c.hasError || undefined,
          })),
        })
      }
    }

    if (dayIndex === 0 && dayData.merged?.struggleSignals) {
      cache.struggleSignals = dayData.merged.struggleSignals
    }

    for (const [cat, score] of Object.entries(dayData.merged.categoryScores)) {
      cache.categoryScores[cat] = (cache.categoryScores[cat] || 0) + Math.round(Number(score) * weight)
    }
    for (const t of dayData.merged.topics) {
      cache.topics[t.topic] = Math.max(cache.topics[t.topic] || 0, Math.round(t.hits * weight))
    }
  }

  const topics = Object.entries(cache.topics)
    .map(([topic, hits]) => ({ topic, hits }))
    .sort((a, b) => b.hits - a.hits)

  return {
    days: cache.days,
    sessionCount: cache.sessionCount,
    prompts: [...new Set(cache.prompts)].slice(-50),
    conversationFlows: cache.conversationFlows.slice(-5),
    topics: topics.slice(0, 10),
    categoryScores: cache.categoryScores,
    struggleSignals: cache.struggleSignals,
  }
}

// ── Backfill ───────────────────────────────────────────────

const MIN_PROMPTS = 5

/**
 * 当日データが薄い場合に過去データで補完する。
 * @param {object} dailyMerged - 当日のマージ済みデータ（変更される）
 * @param {Array<{merged: {categoryScores: Record<string, number>, topics: Array<{topic: string, hits: number}>, promptSamples: string[]}}>} pastDays
 * @returns {object} 補完済みの dailyMerged
 */
export function backfillDailyData(dailyMerged, pastDays) {
  if (dailyMerged.promptSamples.length >= MIN_PROMPTS) return dailyMerged

  const result = {
    ...dailyMerged,
    categoryScores: { ...dailyMerged.categoryScores },
    topics: [...dailyMerged.topics],
    promptSamples: [...dailyMerged.promptSamples],
  }

  for (const past of pastDays) {
    for (const [cat, score] of Object.entries(past.merged.categoryScores)) {
      result.categoryScores[cat] = (result.categoryScores[cat] || 0) + Math.round(Number(score) * 0.5)
    }
    for (const t of past.merged.topics) {
      const existing = result.topics.find((e) => e.topic === t.topic)
      if (existing) existing.hits = Math.max(existing.hits, Math.round(t.hits * 0.5))
      else result.topics.push({ topic: t.topic, hits: Math.round(t.hits * 0.5) })
    }
    const pastPrompts = (past.merged.promptSamples || []).slice(-5)
    result.promptSamples.push(...pastPrompts)
    if (result.promptSamples.length >= MIN_PROMPTS * 2) break
  }
  result.topics.sort((a, b) => b.hits - a.hits)

  return result
}

// ── Recommend ID Generation ────────────────────────────────

/**
 * カテゴリスコアからレコメンド用の問題IDを生成する。
 * @param {Array<{id: string, category: string, difficulty: string}>} quizzes
 * @param {Record<string, number>} categoryScores
 * @returns {string[]}
 */
export function generateRecommendIds(quizzes, categoryScores) {
  const ids = []
  const sorted = Object.entries(categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  for (const [cat] of sorted.slice(0, 3)) {
    const pool = quizzes.filter((q) => q.category === cat).sort(() => Math.random() - 0.5)
    ids.push(...pool.slice(0, 5).map((q) => q.id))
  }
  // Add beginner from unused categories
  const unused = Object.entries(categoryScores)
    .filter(([, s]) => s === 0)
    .map(([c]) => c)
  for (const cat of unused.slice(0, 2)) {
    const pool = quizzes
      .filter((q) => q.category === cat && q.difficulty === 'beginner')
      .sort(() => Math.random() - 0.5)
    ids.push(...pool.slice(0, 3).map((q) => q.id))
  }

  return ids
}
