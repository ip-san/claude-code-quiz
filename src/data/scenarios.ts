/**
 * 実践シナリオデータ
 *
 * 実務に即したストーリー形式で既存の問題を出題する。
 * questionId は quizzes.json の ID を参照する。
 */

export interface ScenarioStep {
  readonly type: 'narrative' | 'question'
  readonly text?: string
  readonly questionId?: string
}

export interface ScenarioData {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced'
  readonly steps: readonly ScenarioStep[]
  readonly completionMessage: string
}

export const SCENARIOS: readonly ScenarioData[] = [
  {
    id: 'scenario-onboard',
    title: 'プロジェクトにClaude Codeを導入する',
    description: '新しいプロジェクトでClaude Codeを使い始める流れを体験',
    icon: '🚀',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: 'あなたは新しいWebプロジェクトのリードエンジニアです。チームにClaude Codeを導入することになりました。まず最初にプロジェクトの設定ファイルを作成しましょう。',
      },
      { type: 'question', questionId: 'mem-001' },
      {
        type: 'narrative',
        text: 'CLAUDE.mdを作成しました。次に、Claude Codeの基本的なコマンドを覚えて、効率的に使えるようにしましょう。',
      },
      { type: 'question', questionId: 'cmd-001' },
      {
        type: 'narrative',
        text: '基本コマンドを覚えました。次はClaude Codeのツールを活用して、最初のタスクに取り掛かりましょう。',
      },
      { type: 'question', questionId: 'tool-001' },
      { type: 'question', questionId: 'skill-001' },
      {
        type: 'narrative',
        text: '順調に進んでいます！最後に、ベストプラクティスを確認して、チームのワークフローを最適化しましょう。',
      },
      { type: 'question', questionId: 'bp-001' },
    ],
    completionMessage:
      'プロジェクトへのClaude Code導入が完了しました！CLAUDE.mdの設定からツール活用まで、基本的な流れを把握できました。',
  },
  {
    id: 'scenario-debug',
    title: '本番障害をClaude Codeで調査する',
    description: '障害対応の流れでClaude Codeの調査・修正機能を学ぶ',
    icon: '🔍',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '金曜の夕方、本番環境でエラーが発生しました。Claude Codeを使って素早く原因を特定し、修正しましょう。まずはセッションの使い方を確認します。',
      },
      { type: 'question', questionId: 'ses-001' },
      {
        type: 'narrative',
        text: 'セッションを開始しました。次にClaude Codeのツールでコードを調査します。',
      },
      { type: 'question', questionId: 'tool-002' },
      { type: 'question', questionId: 'cmd-002' },
      {
        type: 'narrative',
        text: '原因を特定できました。修正を適用する前に、キーボードショートカットで効率的に操作しましょう。',
      },
      { type: 'question', questionId: 'key-001' },
      { type: 'question', questionId: 'bp-002' },
    ],
    completionMessage:
      '障害対応が完了しました！Claude Codeのセッション管理、ツール活用、効率的な操作を実践的に学べました。',
  },
  {
    id: 'scenario-extend',
    title: 'Claude Codeをカスタマイズする',
    description: 'MCP・スキル・フックを使ってClaude Codeを拡張する',
    icon: '🧩',
    difficulty: 'advanced',
    steps: [
      {
        type: 'narrative',
        text: 'チームの開発ワークフローに合わせて、Claude Codeをカスタマイズしましょう。まずは拡張機能の全体像を把握します。',
      },
      { type: 'question', questionId: 'ext-001' },
      {
        type: 'narrative',
        text: '拡張機能の種類を理解しました。次にMCPサーバーを設定して、外部ツールと連携しましょう。',
      },
      { type: 'question', questionId: 'ext-005' },
      { type: 'question', questionId: 'ext-003' },
      {
        type: 'narrative',
        text: 'MCP連携ができました。次はスキルを作成して、チーム固有のワークフローを自動化しましょう。',
      },
      { type: 'question', questionId: 'skill-002' },
      { type: 'question', questionId: 'ext-004' },
    ],
    completionMessage:
      'Claude Codeのカスタマイズが完了しました！MCP、スキル、拡張機能を活用して、チームの生産性を最大化できます。',
  },
]
