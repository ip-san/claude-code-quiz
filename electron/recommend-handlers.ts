/**
 * Electron IPC レコメンドハンドラのビジネスロジック。
 * ファイル I/O を依存注入で受け取り、テスタブルにする。
 */

export interface FileReader {
  readFileSync(path: string, encoding: 'utf8'): string
}

export interface CachedRecommendData {
  date: string
  sessionCount: number
  questionCount: number
  ids: string[]
  topCategories: string[]
  topics: { topic: string; hits: number }[]
  promptSamples: string[]
  reasons?: Record<string, string>
  coachingMessage?: string
}

/**
 * get-cached-recommend IPC ハンドラのビジネスロジック。
 * latest-recommend.json を読み、rolling-7d.json で promptSamples を補完し、
 * reasons.json で coachingMessage を補完する。
 */
export function getCachedRecommendData(storeDir: string, reader: FileReader): CachedRecommendData | null {
  try {
    const filePath = `${storeDir}/latest-recommend.json`
    const content = reader.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    // Return if within last 7 days
    const dataDate = new Date(data.date).getTime()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    if (dataDate < sevenDaysAgo) return null

    // Enrich promptSamples from rolling-7d.json
    try {
      const rolling = JSON.parse(reader.readFileSync(`${storeDir}/rolling-7d.json`, 'utf8'))
      if (rolling.prompts?.length > 0) {
        data.promptSamples = rolling.prompts
      }
    } catch {
      /* rolling not available */
    }

    // Enrich coachingMessage from reasons.json if missing
    if (!data.coachingMessage) {
      try {
        const reasonsData = JSON.parse(reader.readFileSync(`${storeDir}/reasons.json`, 'utf8'))
        if (reasonsData.coachingMessage) data.coachingMessage = reasonsData.coachingMessage
      } catch {
        /* reasons.json not available */
      }
    }

    return data
  } catch {
    return null
  }
}

/**
 * analyze-usage のスコアリング / トピック検出ロジック。
 * JSONL コンテンツ群を受け取り、UsageAnalysis 相当のオブジェクトを返す。
 */
export function analyzeUsageFromContents(
  contents: string[],
  categoryKeywords: Record<string, string[]>,
  topicKeywords: Record<string, string[]>
): {
  tools: Record<string, number>
  topics: { topic: string; hits: number }[]
  categoryScores: Record<string, number>
  promptSamples: string[]
  sessionCount: number
} {
  const tools: Record<string, number> = {}
  const prompts: string[] = []
  const files = new Set<string>()

  for (const content of contents) {
    const lines = content.split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const j = JSON.parse(line)
        if (j.type === 'user' && j.message?.content) {
          const text =
            typeof j.message.content === 'string'
              ? j.message.content
              : j.message.content
                  .filter((c: { type: string }) => c.type === 'text')
                  .map((c: { text: string }) => c.text)
                  .join(' ')
          if (text.length > 5) prompts.push(text)
        }
        if (j.message?.content && Array.isArray(j.message.content)) {
          for (const c of j.message.content) {
            if (c.type === 'tool_use') {
              tools[c.name] = (tools[c.name] || 0) + 1
              if (c.input?.file_path) {
                const parts = c.input.file_path.split('/')
                files.add(parts[parts.length - 1])
              }
              if (c.input?.command) prompts.push(c.input.command)
            }
          }
        }
      } catch {
        /* skip */
      }
    }
  }

  // Score categories
  const allText = [...prompts, ...files, ...Object.keys(tools)].join(' ')
  const categoryScores: Record<string, number> = {}
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    categoryScores[cat] = keywords.reduce((score, kw) => {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return score + (allText.match(regex) || []).length
    }, 0)
  }

  // Detect topics
  const topics: { topic: string; hits: number }[] = []
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const hits = keywords.filter((kw) => allText.toLowerCase().includes(kw.toLowerCase())).length
    if (hits >= 1) topics.push({ topic, hits })
  }
  topics.sort((a, b) => b.hits - a.hits)

  // Sample prompts
  const promptSamples = prompts
    .filter((p) => p.length > 10 && p.length < 200 && !p.startsWith('node ') && !p.startsWith('git '))
    .slice(0, 5)

  return {
    tools,
    topics,
    categoryScores,
    promptSamples,
    sessionCount: contents.length,
  }
}
