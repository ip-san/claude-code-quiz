import { useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { generateAIPrompt } from '@/lib/validation'
import type { QuizItem } from '@/types/quiz'
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Check,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'

interface FeedbackProps {
  quiz: QuizItem
  isCorrect: boolean
}

export function Feedback({ quiz, isCorrect }: FeedbackProps) {
  const { selectedAnswer } = useQuizStore()
  const [copied, setCopied] = useState(false)

  const selectedOption =
    selectedAnswer !== null ? quiz.options[selectedAnswer] : null
  const correctOption = quiz.options[quiz.correctIndex]

  const handleOpenReference = async () => {
    if (!quiz.referenceUrl) return

    try {
      const success = await window.electronAPI.openExternal(quiz.referenceUrl)
      if (!success) {
        console.warn('Failed to open reference URL')
      }
    } catch (error) {
      console.error('Error opening reference URL:', error)
    }
  }

  const handleCopyAIPrompt = async () => {
    try {
      const prompt = generateAIPrompt(
        quiz.question,
        selectedOption?.text ?? '',
        correctOption.text,
        quiz.aiPrompt
      )

      const success = await window.electronAPI.copyToClipboard(prompt)
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        console.warn('Failed to copy to clipboard')
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  return (
    <div
      className={`mt-6 rounded-xl border p-5 ${
        isCorrect
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-red-500/30 bg-red-500/10'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        {isCorrect ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="font-semibold text-green-400">正解！</span>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="font-semibold text-red-400">不正解</span>
          </>
        )}
      </div>

      {/* Wrong feedback - emphasized for incorrect answers */}
      {!isCorrect && selectedOption?.wrongFeedback && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-slate-800/50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <div>
              <p className="mb-1 font-medium text-white">
                なぜこの回答が誤りなのか
              </p>
              <p className="text-sm leading-relaxed text-slate-300">
                {selectedOption.wrongFeedback}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="mb-4">
        <p className="mb-1 text-sm font-medium text-white">解説</p>
        <p className="text-sm leading-relaxed text-slate-300">
          {quiz.explanation}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="アクションボタン">
        {quiz.referenceUrl && (
          <button
            onClick={handleOpenReference}
            aria-label="公式ドキュメントを開く"
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            公式ドキュメント
          </button>
        )}

        {!isCorrect && (
          <button
            onClick={handleCopyAIPrompt}
            aria-label={copied ? 'プロンプトをコピーしました' : 'AIに深掘りするためのプロンプトをコピー'}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/20"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                コピーしました
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                AIに深掘りする
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
