import { Fragment, type ReactNode } from 'react'

/**
 * Renders quiz text with:
 * - \n → line breaks
 * - `code` → <code> inline code elements
 */
export function QuizText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{parseQuizText(text)}</span>
}

function parseQuizText(text: string): ReactNode[] {
  // Split by newlines first, then parse inline code within each line
  const lines = text.split('\n')
  const result: ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      result.push(<br key={`br-${i}`} />)
    }
    result.push(<Fragment key={`line-${i}`}>{parseInlineCode(lines[i])}</Fragment>)
  }

  return result
}

function parseInlineCode(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /`([^`]+)`/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    // Code element
    parts.push(
      <code
        key={match.index}
        className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.9em] text-stone-800"
      >
        {match[1]}
      </code>
    )
    lastIndex = regex.lastIndex
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
