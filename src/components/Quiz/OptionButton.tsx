import { X, Square, CheckSquare } from 'lucide-react'
import { QuizText } from './QuizText'

interface OptionButtonProps {
  index: number
  text: string
  isSelected: boolean
  isCorrect: boolean
  isAnswered: boolean
  isMultiSelect?: boolean
  onClick: () => void
}

export function OptionButton({
  index,
  text,
  isSelected,
  isCorrect,
  isAnswered,
  isMultiSelect = false,
  onClick,
}: OptionButtonProps) {
  const getStyles = () => {
    if (!isAnswered) {
      return isSelected
        ? 'border-claude-orange bg-claude-orange/5 shadow-sm'
        : 'border-stone-200'
    }

    if (isCorrect) {
      return 'border-green-500 bg-green-50'
    }

    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-50'
    }

    return 'border-stone-200 opacity-50'
  }

  // Animation class based on answer state
  const getAnimClass = () => {
    if (!isAnswered) {
      return isSelected ? 'animate-option-pop' : ''
    }
    if (isCorrect) return 'animate-option-correct'
    if (isSelected && !isCorrect) return 'animate-option-wrong'
    return ''
  }

  const getIcon = () => {
    if (!isAnswered) return null

    if (isCorrect) {
      return (
        <div key="correct" className="check-icon-enter flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-500" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="check-stroke-draw">
            <path d="M3 9.5L7 13.5L15 4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )
    }

    if (isSelected && !isCorrect) {
      return (
        <div key="wrong" className="wrong-icon-enter flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-500" aria-hidden="true">
          <X className="h-4 w-4 text-white" />
        </div>
      )
    }

    return null
  }

  const optionLabel = String.fromCharCode(65 + index) // A, B, C, D...

  // Accessibility label construction
  const getAriaLabel = () => {
    const base = `選択肢${optionLabel}: ${text}`
    if (!isAnswered) {
      return isSelected ? `${base}（選択中）` : base
    }
    if (isCorrect) {
      return `${base}（正解）`
    }
    if (isSelected && !isCorrect) {
      return `${base}（不正解）`
    }
    return base
  }

  // Multi-select: checkbox-style badge / Single-select: circle badge
  const renderBadge = () => {
    if (isMultiSelect) {
      if (isSelected) {
        return (
          <CheckSquare
            className={`h-6 w-6 flex-shrink-0 ${
              isAnswered
                ? isCorrect ? 'text-green-500' : 'text-red-500'
                : 'text-claude-orange'
            }`}
            aria-hidden="true"
          />
        )
      }
      return (
        <Square
          className={`h-6 w-6 flex-shrink-0 ${
            isAnswered ? 'text-stone-300' : 'text-stone-400'
          }`}
          aria-hidden="true"
        />
      )
    }

    return (
      <span
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${
          isSelected && !isAnswered
            ? 'bg-claude-orange text-white'
            : 'bg-stone-100 text-stone-600'
        }`}
      >
        {optionLabel}
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={isAnswered}
      aria-label={getAriaLabel()}
      aria-pressed={isMultiSelect ? undefined : isSelected}
      aria-checked={isMultiSelect ? isSelected : undefined}
      role={isMultiSelect ? 'checkbox' : 'option'}
      className={`no-select w-full rounded-2xl border-2 px-3.5 py-3 text-left transition-all sm:px-4 sm:py-4 ${getStyles()} ${getAnimClass()} ${
        isAnswered ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'
      }`}
    >
      <div className="flex items-start gap-3">
        {renderBadge()}
        <span className="flex-1 text-sm leading-snug text-claude-dark sm:text-base sm:leading-relaxed"><QuizText text={text} /></span>
        {getIcon()}
      </div>
    </button>
  )
}
