/**
 * スコアに基づく結果メッセージを返すサービス
 * QuizResult から抽出した純粋関数
 */

export interface ScoreMessage {
  readonly title: string
  readonly message: string
  readonly color: string
  readonly bgColor: string
  readonly borderColor: string
}

const MESSAGES: readonly { min: number; result: ScoreMessage }[] = [
  {
    min: 100,
    result: {
      title: 'パーフェクト！',
      message: '全問正解。あなたは Claude Code を完全に理解しています。',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
  },
  {
    min: 80,
    result: {
      title: '素晴らしい！',
      message: 'ここまで来たあなたなら、実務でも活躍できます。',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  },
  {
    min: 70,
    result: {
      title: '着実に成長しています',
      message: '基礎は身についています。復習で更に自信をつけましょう。',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  },
  {
    min: 50,
    result: {
      title: 'いい線いってます',
      message: 'あと少しです。間違えた問題を見直すだけで、大きく伸びます。',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
  },
  {
    min: 0,
    result: {
      title: '最初の一歩を踏み出しました',
      message: 'ここから始まります。繰り返すほど必ず伸びます。',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  },
]

export function getScoreMessage(percentage: number): ScoreMessage {
  return (MESSAGES.find((m) => percentage >= m.min) ?? MESSAGES[MESSAGES.length - 1]).result
}
