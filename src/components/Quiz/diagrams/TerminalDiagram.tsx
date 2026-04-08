import { Check, Clipboard, Play, SkipForward } from 'lucide-react'
import { useState } from 'react'
import { locale } from '@/config/locale'
import { platformAPI } from '@/lib/platformAPI'
import { useDiagramAnimation } from './useDiagramAnimation'
import { useTerminalAnimation } from './useTerminalAnimation'

interface TerminalLine {
  type: 'command' | 'prompt' | 'response' | 'info'
  text: string
}

interface TerminalDiagramProps {
  label?: string
  lines: TerminalLine[]
}

function formatLinesForCopy(lines: TerminalLine[]): string {
  return lines
    .filter((l) => l.type === 'command' || l.type === 'prompt')
    .map((l) => l.text)
    .join('\n')
}

/**
 * Claude Code 風ターミナル図（タイピングアニメーション付き）
 *
 * 初回表示時に自動再生。完了後はリプレイボタンで再実行可能。
 *
 * line types:
 * - command: シェルコマンド（$ prefix）— タイプライター効果
 * - prompt: ユーザー入力（> prefix）— タイプライター効果
 * - response: Claude の応答（✦ prefix）— フェードイン
 * - info: 補足テキスト（dim）— フェードイン
 */
export function TerminalDiagram({ label, lines }: TerminalDiagramProps) {
  const [copied, setCopied] = useState(false)
  const { containerRef, isVisible } = useDiagramAnimation({
    itemCount: lines.length,
    staggerMs: 80,
  })

  const { getLineState, isComplete, isPlaying, skipAnimation, replayAnimation } = useTerminalAnimation(lines, isVisible)

  return (
    <div ref={containerRef} aria-label={label ?? locale.diagrams.terminal}>
      {/* Screen reader: full text always available */}
      <div className="sr-only">
        {lines.map((line, i) => (
          <p key={i}>
            {line.type === 'command' && `$ ${line.text}`}
            {line.type === 'prompt' && `> ${line.text}`}
            {line.type === 'response' && `✦ ${line.text}`}
            {line.type === 'info' && line.text}
          </p>
        ))}
      </div>

      {label && <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>}
      {/* Terminal window */}
      <div className="overflow-hidden rounded-lg border border-stone-700 bg-stone-900 shadow-lg" aria-hidden="true">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b border-stone-700 bg-stone-800 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 flex-1 text-[10px] text-stone-400">Claude Code</span>
          {/* Skip / Replay button */}
          {isPlaying && (
            <button
              onClick={skipAnimation}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200"
            >
              <SkipForward className="h-3 w-3" />
              {locale.diagrams.terminalSkip}
            </button>
          )}
          {isComplete && (
            <>
              <button
                onClick={replayAnimation}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200"
              >
                <Play className="h-3 w-3" />
                {locale.diagrams.terminalReplay}
              </button>
              <button
                onClick={async () => {
                  const text = formatLinesForCopy(lines)
                  if (!text) return
                  const ok = await platformAPI.copyToClipboard(text)
                  if (ok) {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }
                }}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200"
                aria-label={locale.diagrams.terminalCopy}
              >
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Clipboard className="h-3 w-3" />}
                {locale.diagrams.terminalCopy}
              </button>
            </>
          )}
        </div>
        {/* Terminal body */}
        <div className="space-y-0.5 px-3 py-2.5 font-mono text-xs leading-relaxed">
          {lines.map((line, i) => {
            const state = getLineState(i)
            if (!state.visible) return <div key={i} className="h-5" />

            const revealClass = state.justRevealed ? 'animate-terminal-reveal' : ''

            return (
              <div key={i} className={revealClass}>
                {line.type === 'command' && (
                  <p className="text-stone-300">
                    <span className="text-green-400">$</span>{' '}
                    <span>{state.typingChars !== null ? line.text.slice(0, state.typingChars) : line.text}</span>
                    {state.typingChars !== null && (
                      <span className="ml-px animate-terminal-cursor text-stone-400">▋</span>
                    )}
                  </p>
                )}
                {line.type === 'prompt' && (
                  <div className="-mx-3 border-y border-claude-orange/40 bg-claude-orange/5 px-3 py-1">
                    <p>
                      <span className="text-claude-orange">&gt;</span>{' '}
                      <span className="text-white">
                        {state.typingChars !== null ? line.text.slice(0, state.typingChars) : line.text}
                      </span>
                      {state.typingChars !== null && (
                        <span className="ml-px animate-terminal-cursor text-stone-400">▋</span>
                      )}
                    </p>
                  </div>
                )}
                {line.type === 'response' && (
                  <p>
                    <span className="text-claude-orange">✦</span> <span className="text-stone-300">{line.text}</span>
                  </p>
                )}
                {line.type === 'info' && <p className="text-stone-500">{line.text}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
