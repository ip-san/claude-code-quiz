import { Check, X } from 'lucide-react'

interface OptionButtonProps {
  index: number
  text: string
  isSelected: boolean
  isCorrect: boolean
  isAnswered: boolean
  onClick: () => void
}

export function OptionButton({
  index,
  text,
  isSelected,
  isCorrect,
  isAnswered,
  onClick,
}: OptionButtonProps) {
  const getStyles = () => {
    if (!isAnswered) {
      return isSelected
        ? 'border-blue-500 bg-blue-500/10'
        : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
    }

    if (isCorrect) {
      return 'border-green-500 bg-green-500/10'
    }

    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-500/10'
    }

    return 'border-slate-700 opacity-50'
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

  return (
    <button
      onClick={onClick}
      disabled={isAnswered}
      aria-label={getAriaLabel()}
      aria-pressed={isSelected}
      role="option"
      className={`no-select w-full rounded-xl border-2 p-4 text-left transition-all ${getStyles()} ${
        isAnswered ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${
            isSelected && !isAnswered
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {optionLabel}
        </span>
        <span className="flex-1 leading-relaxed text-slate-200">{text}</span>
        {getIcon()}
      </div>
    </button>
  )
}
