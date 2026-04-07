import { locale } from '@/config/locale'
import { useDiagramAnimation } from './useDiagramAnimation'

interface TerminalLine {
  type: 'command' | 'prompt' | 'response' | 'info'
  text: string
}

interface TerminalDiagramProps {
  label?: string
  lines: TerminalLine[]
}

/**
 * Claude Code 風ターミナル図
 * 解説にコマンド入力イメージを埋め込む。
 *
 * line types:
 * - command: シェルコマンド（$ prefix）
 * - prompt: ユーザー入力（> prefix、claude-orange）
 * - response: Claude の応答（✦ prefix）
 * - info: 補足テキスト（dim）
 */
export function TerminalDiagram({ label, lines }: TerminalDiagramProps) {
  const { containerRef, isVisible, getItemDelay } = useDiagramAnimation({
    itemCount: lines.length,
    staggerMs: 80,
  })

  return (
    <div ref={containerRef} aria-label={label ?? locale.diagrams.terminal}>
      {label && <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>}
      {/* Terminal window */}
      <div className="overflow-hidden rounded-lg border border-stone-700 bg-stone-900 shadow-lg">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b border-stone-700 bg-stone-800 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[10px] text-stone-400">Claude Code</span>
        </div>
        {/* Terminal body */}
        <div className="space-y-0.5 px-3 py-2.5 font-mono text-xs leading-relaxed">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${isVisible ? 'animate-diagram-slide-right' : 'opacity-0'}`}
              style={{ animationDelay: getItemDelay(i) }}
            >
              {line.type === 'command' && (
                <p className="text-stone-300">
                  <span className="text-green-400">$</span> {line.text}
                </p>
              )}
              {line.type === 'prompt' && (
                <p>
                  <span className="text-claude-orange">&gt;</span> <span className="text-white">{line.text}</span>
                </p>
              )}
              {line.type === 'response' && (
                <p>
                  <span className="text-claude-orange">✦</span> <span className="text-stone-300">{line.text}</span>
                </p>
              )}
              {line.type === 'info' && <p className="text-stone-500">{line.text}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
