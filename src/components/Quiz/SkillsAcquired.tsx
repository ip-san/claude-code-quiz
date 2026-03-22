import { useMemo } from 'react'
import type { Question } from '@/domain/entities/Question'
import type { AnswerRecord } from '@/domain/services/QuizSessionService'
import { CheckCircle } from 'lucide-react'

/** カテゴリIDから「できるようになったこと」のマッピング */
const SKILL_DESCRIPTIONS: Record<string, string> = {
  memory: 'AI にプロジェクトの文脈を記憶させられる',
  skills: 'チーム専用の AI ワークフローを作れる',
  tools: 'AI にファイル操作やコード検索を任せられる',
  commands: 'AI との対話を効率的にコントロールできる',
  extensions: 'MCP やプラグインで AI の能力を拡張できる',
  session: 'AI との作業セッションを安全に管理できる',
  keyboard: 'ショートカットで AI を素早く操作できる',
  bestpractices: 'AI を活用して実務で成果を出せる',
}

interface SkillsAcquiredProps {
  questions: readonly Question[]
  answerHistory: ReadonlyMap<number, AnswerRecord>
}

/**
 * 結果画面に表示する「身につけたスキル」セクション
 * 正解したカテゴリから、実務で何ができるようになったかを伝える
 */
export function SkillsAcquired({ questions, answerHistory }: SkillsAcquiredProps) {
  const acquiredSkills = useMemo(() => {
    const categoryCorrect = new Map<string, number>()

    answerHistory.forEach((record, index) => {
      if (record.isCorrect && questions[index]) {
        const cat = questions[index].category
        categoryCorrect.set(cat, (categoryCorrect.get(cat) ?? 0) + 1)
      }
    })

    // Only show categories where user got at least 1 correct
    return Array.from(categoryCorrect.entries())
      .filter(([, count]) => count > 0)
      .map(([catId]) => ({
        id: catId,
        description: SKILL_DESCRIPTIONS[catId] ?? '',
      }))
      .filter(s => s.description)
  }, [questions, answerHistory])

  if (acquiredSkills.length === 0) return null

  return (
    <div className="mb-4 rounded-2xl border border-green-200 bg-green-50/50 p-4 text-left dark:border-green-500/30 dark:bg-green-500/10">
      <p className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">
        あなたが身につけたこと
      </p>
      <div className="space-y-1.5">
        {acquiredSkills.map((skill) => (
          <div key={skill.id} className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
            <p className="text-sm text-stone-700 dark:text-stone-300">{skill.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
