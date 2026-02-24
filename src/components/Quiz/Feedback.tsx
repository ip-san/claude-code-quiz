import { useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import type { Question } from '@/domain/entities/Question'
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Check,
  Sparkles,
  AlertTriangle,
  FileText,
} from 'lucide-react'

interface FeedbackProps {
  quiz: Question
  isCorrect: boolean
}

export function Feedback({ quiz, isCorrect }: FeedbackProps) {
  const { sessionState } = useQuizStore()
  const [copied, setCopied] = useState(false)
  const [markdownCopied, setMarkdownCopied] = useState(false)

  const selectedAnswer = sessionState?.selectedAnswer ?? null
  const selectedOption =
    selectedAnswer !== null ? quiz.options[selectedAnswer] : null
  const isReviewMode = sessionState?.isReviewMode ?? false
  const reviewUserAnswers = sessionState?.reviewUserAnswers ?? []
  const currentIndex = sessionState?.currentIndex ?? 0
  const originalUserAnswer = isReviewMode ? reviewUserAnswers[currentIndex] : null

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
      const prompt = quiz.generateAIPrompt()

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

  const handleCopyMarkdown = async () => {
    try {
      const markdown = quiz.toMarkdown()

      const success = await window.electronAPI.copyToClipboard(markdown)
      if (success) {
        setMarkdownCopied(true)
        setTimeout(() => setMarkdownCopied(false), 2000)
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

      {/* Review mode: show original user answer */}
      {isReviewMode && originalUserAnswer !== null && originalUserAnswer !== quiz.correctIndex && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            <span className="font-medium">あなたの回答:</span>{' '}
            {quiz.options[originalUserAnswer]?.text}
          </p>
          <p className="mt-1 text-sm text-green-700">
            <span className="font-medium">正解:</span>{' '}
            {quiz.options[quiz.correctIndex]?.text}
          </p>
        </div>
      )}

      {/* Wrong feedback - emphasized for incorrect answers */}
      {!isCorrect && selectedOption?.wrongFeedback && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="mb-1 font-medium text-claude-dark">
                なぜこの回答が誤りなのか
              </p>
              <p className="text-sm leading-relaxed text-stone-600">
                {selectedOption.wrongFeedback}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Explanation - with scroll support for long content */}
      <div className="mb-4">
        <p className="mb-1 text-sm font-medium text-claude-dark">解説</p>
        <div className="max-h-48 overflow-y-auto">
          <p className="text-sm leading-relaxed text-stone-600">
            {quiz.explanation}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="アクションボタン">
        {quiz.referenceUrl && (
          <button
            onClick={handleOpenReference}
            aria-label="公式ドキュメントを開く"
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            公式ドキュメント
          </button>
        )}

        {/* Markdown copy button - always visible */}
        <button
          onClick={handleCopyMarkdown}
          aria-label={markdownCopied ? 'Markdownをコピーしました' : 'Markdown形式でコピー'}
          className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-500/20"
        >
          {markdownCopied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              コピーしました
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Markdown形式
            </>
          )}
        </button>

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
