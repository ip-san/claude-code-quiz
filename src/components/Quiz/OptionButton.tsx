import { Check, X, Square, CheckSquare } from 'lucide-react'
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
        ? 'border-claude-orange bg-claude-orange/5'
        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
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
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500" aria-hidden="true">
          <Check className="h-4 w-4 text-white" />
        </div>
      )
    }

    if (isSelected && !isCorrect) {
      return (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500" aria-hidden="true">
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
      if (isSelected && !isAnswered) {
        return (
          <CheckSquare
            className="h-6 w-6 flex-shrink-0 text-claude-orange"
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
      aria-pressed={isSelected}
      aria-checked={isMultiSelect ? isSelected : undefined}
      role={isMultiSelect ? 'checkbox' : 'option'}
      className={`no-select w-full rounded-xl border-2 p-4 text-left transition-all ${getStyles()} ${getAnimClass()} ${
        isAnswered ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        {renderBadge()}
        <span className="flex-1 leading-relaxed text-claude-dark"><QuizText text={text} /></span>
        {getIcon()}
      </div>
    </button>
  )
}
