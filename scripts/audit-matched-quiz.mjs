#!/usr/bin/env node
/**
 * Opus Batch Audit: Haiku "matched" 判定の独立検証
 *
 * pre-verify-results.json の matched 項目について、
 * Opus が Haiku の判定理由を精査し、不適切な判定をデモートする。
 *
 * 出力:
 *   .claude/tmp/opus-audit-results.json（監査ログ）
 *   .claude/tmp/pre-verify-results.json（更新: demoted → sonnetTargets に追加）
 *
 * フォールバック: ANTHROPIC_API_KEY 未設定 or API エラー時はスキップ（現行動作維持）
 */

// ── Pure functions (exported for testing) ──────────────────

/**
 * Parse Opus JSON response text into an array of audit verdicts.
 * @param {string} text - Raw response text (may include markdown fences)
 * @returns {Array<{id: string, verdict: string, reason: string}>}
 */
export function parseAuditResponse(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const match = cleaned.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

/**
 * Build compact audit claims from quiz data and Haiku matched items.
 * @param {Array} quizzes - Full quiz objects
 * @param {Array<{id: string, reason: string, matchedDoc: string}>} matchedItems
 * @returns {Array} Claims for Opus audit
 */
export function buildAuditClaims(quizzes, matchedItems) {
  const quizMap = new Map(quizzes.map((q) => [q.id, q]))

  return matchedItems
    .filter((m) => quizMap.has(m.id))
    .map((m) => {
      const q = quizMap.get(m.id)
      return {
        id: q.id,
        question: q.question.slice(0, 100),
        correctAnswer: q.options[q.correctIndex]?.text?.slice(0, 80) || '',
        explanation: q.explanation?.slice(0, 100) || '',
        category: q.category,
        haikuReason: m.reason || '',
        matchedDoc: m.matchedDoc || '',
      }
    })
}

/**
 * Update pre-verify results by demoting items Opus flagged.
 * @param {object} preVerifyResults - Current pre-verify-results.json content
 * @param {Array<{id: string, verdict: string, reason: string}>} auditVerdicts
 * @returns {object} Updated pre-verify results
 */
export function updatePreVerifyResults(preVerifyResults, auditVerdicts) {
  const demotedIds = new Set(auditVerdicts.filter((v) => v.verdict === 'demote').map((v) => v.id))

  if (demotedIds.size === 0) return preVerifyResults

  const demotedReasons = new Map(auditVerdicts.filter((v) => v.verdict === 'demote').map((v) => [v.id, v.reason || '']))

  const newMatched = preVerifyResults.matched.filter((m) => !demotedIds.has(m.id))
  const demotedItems = preVerifyResults.matched
    .filter((m) => demotedIds.has(m.id))
    .map((m) => ({ id: m.id, reason: `Opus audit: ${demotedReasons.get(m.id) || '要再検証'}` }))

  const newFlagged = [...(preVerifyResults.flagged || []), ...demotedItems]
  const newSonnetTargets = [...new Set([...(preVerifyResults.sonnetTargets || []), ...demotedIds])]

  return {
    ...preVerifyResults,
    matched: newMatched,
    flagged: newFlagged,
    sonnetTargets: newSonnetTargets,
    skipCount: newMatched.length,
    opusAudit: {
      auditedAt: new Date().toISOString(),
      confirmed: preVerifyResults.matched.length - demotedIds.size,
      demoted: demotedIds.size,
      demotedIds: [...demotedIds],
    },
  }
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const { execSync } = await import('child_process')
  const { existsSync, mkdirSync, readFileSync, writeFileSync } = await import('fs')
  const { join } = await import('path')

  const PROJECT_DIR = process.cwd()

  // Load .env.local if present (git-ignored)
  const envLocalPath = join(PROJECT_DIR, '.env.local')
  if (existsSync(envLocalPath)) {
    for (const line of readFileSync(envLocalPath, 'utf8').split('\n')) {
      const match = line.match(/^([A-Z_]+)=(.+)$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
    }
  }

  const TMP_DIR = join(PROJECT_DIR, '.claude', 'tmp')
  const PRE_VERIFY_FILE = join(TMP_DIR, 'pre-verify-results.json')
  const AUDIT_OUTPUT_FILE = join(TMP_DIR, 'opus-audit-results.json')
  const QUIZ_FILE = join(PROJECT_DIR, 'src', 'data', 'quizzes.json')

  // ── Guard ─────────────────────────────────────────────────
  if (!existsSync(PRE_VERIFY_FILE)) {
    console.log('Opus audit skipped: pre-verify-results.json not found')
    return
  }

  const preVerifyResults = JSON.parse(readFileSync(PRE_VERIFY_FILE, 'utf8'))
  const matchedItems = preVerifyResults.matched || []

  if (matchedItems.length === 0) {
    console.log('Opus audit skipped: no matched items to audit')
    return
  }

  console.log(`Opus audit: reviewing ${matchedItems.length} Haiku "matched" verdicts...`)

  // ── Load quiz data for matched items ──────────────────────
  const quizData = JSON.parse(readFileSync(QUIZ_FILE, 'utf8'))
  const matchedIds = new Set(matchedItems.map((m) => m.id))
  const matchedQuizzes = quizData.quizzes.filter((q) => matchedIds.has(q.id))

  // ── Build doc context (reuse cached docs) ─────────────────
  const categories = [...new Set(matchedQuizzes.map((q) => q.category))]
  const categoryDocMap = preVerifyResults.categoryDocMap || {}

  let docContext = ''
  for (const cat of categories) {
    const pages = categoryDocMap[cat] || []
    if (pages.length === 0) {
      docContext += `\n## ${cat}\n(ドキュメントマッピングなし)\n`
      continue
    }
    try {
      const doc = execSync(`node scripts/fetch-docs.mjs --assemble --pages ${pages.join(',')}`, {
        timeout: 30_000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      docContext += `\n## ${cat}\n${doc.slice(0, 3000)}\n`
    } catch {
      docContext += `\n## ${cat}\n(ドキュメント取得失敗)\n`
    }
  }

  // ── Build audit prompt ────────────────────────────────────
  const systemPrompt = `あなたはクイズ品質監査人です。Haiku（高速モデル）が「ドキュメントと事実一致」と判定したクイズ問題について、判定の妥当性を精査してください。

## 判定ルール
- "confirm": Haikuの判定は妥当。正解と解説がドキュメントと一致
- "demote": Haikuの判定に問題あり。以下のいずれかに該当:
  - 数値、デフォルト値、動作が実際のドキュメントと異なる
  - Haikuの根拠が薄い（根拠なし、曖昧な一致）
  - ドキュメントの記述が変更されている可能性
  - 廃止・非推奨になった機能への言及

Haikuが見落としやすいパターン:
- デフォルト値の誤り（例: mode の初期値）
- 数値の混同（例: 「5つ」vs「6つ」の選択肢数）
- 用語の正式名称の不一致
- 廃止/非推奨になった機能
- 条件付きの事実を無条件と判定

**重要**: 迷ったら demote してください。Sonnet が再検証するのでコストは低い。`

  const claims = buildAuditClaims(matchedQuizzes, matchedItems)

  const userPrompt = `## ドキュメント（抜粋）
${docContext.slice(0, 12000)}

## Haiku が「事実一致」と判定した問題
${JSON.stringify(claims)}

JSON配列で返してください。各要素: {"id": "xxx-NNN", "verdict": "confirm|demote", "reason": "判定理由（30文字以内）"}
説明不要、JSON配列のみ。`

  // ── Call Opus (SDK → claude -p fallback) ───────────────────

  async function callOpusSDK() {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }

    return {
      text,
      model: 'claude-opus-4-6',
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    }
  }

  function callOpusClaudeP() {
    const promptFile = join(TMP_DIR, 'opus-audit-prompt.txt')
    writeFileSync(promptFile, `${systemPrompt}\n\n${userPrompt}`)

    // Strip ANTHROPIC_API_KEY so claude -p uses Max plan, not API credits
    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY

    const raw = execSync(`cat "${promptFile}" | claude -p - --model opus --output-format text`, {
      timeout: 600_000,
      encoding: 'utf8',
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let text = raw
    try {
      const wrapper = JSON.parse(raw)
      text = typeof wrapper === 'string' ? wrapper : wrapper.result || JSON.stringify(wrapper)
    } catch {
      // Not JSON wrapper
    }

    return { text, model: 'claude-opus-4-6(claude-p)', inputTokens: 0, outputTokens: 0 }
  }

  try {
    let result
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log('  Using Anthropic SDK (Opus)...')
        result = await callOpusSDK()
      } catch (sdkErr) {
        console.warn(`  SDK failed (${sdkErr.message?.slice(0, 80)}), falling back to claude -p...`)
        result = callOpusClaudeP()
      }
    } else {
      console.log('  Using claude -p (Opus)...')
      result = callOpusClaudeP()
    }

    const auditVerdicts = parseAuditResponse(result.text)
    const confirmed = auditVerdicts.filter((v) => v.verdict === 'confirm')
    const demoted = auditVerdicts.filter((v) => v.verdict === 'demote')

    // ── Write audit log ───────────────────────────────────────
    mkdirSync(TMP_DIR, { recursive: true })

    const auditLog = {
      auditedAt: new Date().toISOString(),
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalAudited: matchedItems.length,
      confirmed: confirmed.length,
      demoted: demoted.length,
      demotedIds: demoted.map((v) => v.id),
      details: auditVerdicts,
    }

    writeFileSync(AUDIT_OUTPUT_FILE, JSON.stringify(auditLog, null, 2))

    // ── Update pre-verify-results.json ────────────────────────
    if (demoted.length > 0) {
      const updated = updatePreVerifyResults(preVerifyResults, auditVerdicts)
      writeFileSync(PRE_VERIFY_FILE, JSON.stringify(updated, null, 2))
    }

    console.log(`✓ Opus audit: ${confirmed.length} confirmed, ${demoted.length} demoted`)
    if (demoted.length > 0) {
      console.log(`  Demoted: ${demoted.map((v) => v.id).join(', ')}`)
      console.log(`  → Sonnet targets: ${preVerifyResults.sonnetTargets.length + demoted.length}`)
    }
  } catch (err) {
    console.warn(`Opus audit failed, skipping: ${err.message?.slice(0, 120)}`)
  }
}

// Run only when executed directly (not when imported for testing)
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''))
if (isDirectRun) {
  main()
}
