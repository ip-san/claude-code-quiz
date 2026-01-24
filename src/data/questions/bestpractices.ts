import type { QuizItem } from '@/types/quiz'

/**
 * Best Practices category questions - 5 questions
 * Topics: Effective usage patterns, prompt design, workflow optimization
 */
export const bestpracticesQuestions: QuizItem[] = [
  {
    id: 'bp-001',
    category: 'bestpractices',
    difficulty: 'intermediate',
    question: 'Claudeに複雑なタスクを依頼する際のベストプラクティスはどれですか？',
    options: [
      { text: '一度に全ての要件を詳細に伝える', wrongFeedback: '一度に全て伝えるのは効果的ではありません。' },
      { text: 'タスクを小さなステップに分割して段階的に進める', wrongFeedback: '' },
      { text: '曖昧にして自由度を持たせる', wrongFeedback: '曖昧すぎると期待通りの結果が得られません。' },
      { text: '詳細は後で追加する', wrongFeedback: '最初から必要な情報を提供すべきです。' },
    ],
    correctIndex: 1,
    explanation: '複雑なタスクは小さなステップに分割することで、より正確な結果が得られます。',
    referenceUrl: 'https://code.claude.com/docs/en/how-claude-code-works',
    aiPrompt: '効果的なプロンプトの書き方を教えてください。',
  },
  {
    id: 'bp-002',
    category: 'bestpractices',
    difficulty: 'advanced',
    question: 'コードベースの探索時、最も効率的なアプローチはどれですか？',
    options: [
      { text: '全ファイルをReadツールで読む', wrongFeedback: '全ファイルを読むのは非効率です。' },
      { text: 'Exploreサブエージェントを使用する', wrongFeedback: '' },
      { text: '手動でlsコマンドを実行する', wrongFeedback: 'lsは構造把握には不十分です。' },
      { text: '全ファイルをGrepで検索する', wrongFeedback: 'Grepだけでは全体像が把握できません。' },
    ],
    correctIndex: 1,
    explanation: 'Exploreサブエージェントはコードベースの構造理解に最適化されています。',
    referenceUrl: 'https://code.claude.com/docs/en/how-claude-code-works',
    aiPrompt: 'コードベース探索のベストプラクティスを教えてください。',
  },
  {
    id: 'bp-003',
    category: 'bestpractices',
    difficulty: 'intermediate',
    question: 'CLAUDE.mdファイルの適切な使い方はどれですか？',
    options: [
      { text: 'プロジェクトの全コードを記述する', wrongFeedback: 'コードの記述用ではありません。' },
      { text: 'プロジェクトの慣習、パターン、重要な情報を記録する', wrongFeedback: '' },
      { text: '会話履歴を保存する', wrongFeedback: '会話履歴保存用ではありません。' },
      { text: '実行可能なスクリプトを格納する', wrongFeedback: 'スクリプト格納用ではありません。' },
    ],
    correctIndex: 1,
    explanation: 'CLAUDE.mdにはコーディング規約、アーキテクチャ、重要なパターンを記録します。',
    referenceUrl: 'https://code.claude.com/docs/en/claude-md',
    aiPrompt: 'CLAUDE.mdの効果的な書き方を教えてください。',
  },
  {
    id: 'bp-004',
    category: 'bestpractices',
    difficulty: 'beginner',
    question: 'Claudeにコードレビューを依頼する際のベストプラクティスはどれですか？',
    options: [
      { text: 'ファイル全体を貼り付ける', wrongFeedback: 'ファイル全体ではなくファイルパスを指定します。' },
      { text: '@でファイルパスを指定してレビュー観点を明示する', wrongFeedback: '' },
      { text: '口頭で説明する', wrongFeedback: '具体的なファイル指定が必要です。' },
      { text: '変更点のみをコピー＆ペーストする', wrongFeedback: 'ファイル参照の方が効率的です。' },
    ],
    correctIndex: 1,
    explanation: '@でファイルを参照し、レビュー観点（パフォーマンス、セキュリティ等）を明示します。',
    referenceUrl: 'https://code.claude.com/docs/en/interactive-mode',
    aiPrompt: 'コードレビューの効果的な依頼方法を教えてください。',
  },
  {
    id: 'bp-005',
    category: 'bestpractices',
    difficulty: 'advanced',
    question: '長時間のセッションでコンテキストを効率的に管理するベストプラクティスはどれですか？',
    options: [
      { text: '何もせずそのまま続ける', wrongFeedback: '積極的な管理が必要です。' },
      { text: '定期的に/compactで圧縮し、CLAUDE.mdに重要事項を記録する', wrongFeedback: '' },
      { text: '頻繁に/clearで履歴を消す', wrongFeedback: '頻繁なクリアは情報を失います。' },
      { text: '新しいターミナルを開く', wrongFeedback: '新ターミナルでは前のコンテキストを失います。' },
    ],
    correctIndex: 1,
    explanation: '/compactで定期的に圧縮し、CLAUDE.mdに重要情報を記録することでコンテキストを効率管理できます。',
    referenceUrl: 'https://code.claude.com/docs/en/how-claude-code-works#context-management',
    aiPrompt: 'コンテキスト管理のベストプラクティスを教えてください。',
  },
]
