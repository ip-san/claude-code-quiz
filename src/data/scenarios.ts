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
  {
    id: 'scenario-team',
    title: 'チーム開発のベストプラクティス',
    description: 'チームでClaude Codeを効果的に使うためのルールと運用を学ぶ',
    icon: '👥',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: 'あなたのチームは5人のエンジニアで構成されています。全員がClaude Codeを使い始めましたが、ルールやワークフローがバラバラです。チーム全体の効率を上げるために、まずはCLAUDE.mdの管理方法を統一しましょう。',
      },
      { type: 'question', questionId: 'mem-004' },
      { type: 'question', questionId: 'mem-005' },
      {
        type: 'narrative',
        text: 'メモリの使い分けを理解しました。次に、チームが共通で使えるスキルを整備しましょう。',
      },
      { type: 'question', questionId: 'skill-007' },
      {
        type: 'narrative',
        text: 'スキルの配置を覚えました。最後に、チーム全員が守るべきベストプラクティスを確認します。',
      },
      { type: 'question', questionId: 'bp-003' },
      { type: 'question', questionId: 'bp-006' },
    ],
    completionMessage:
      'チーム開発のルール整備が完了しました！メモリの使い分け、スキルの共有、ベストプラクティスの統一で、チーム全体の生産性が向上します。',
  },
  {
    id: 'scenario-keyboard',
    title: 'キーボード操作をマスターする',
    description: 'ショートカットと操作テクニックで作業速度を2倍にする',
    icon: '⌨️',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: 'Claude Codeをマウスやトラックパッドなしで効率的に操作するテクニックを覚えましょう。まずは基本的な操作から。',
      },
      { type: 'question', questionId: 'key-003' },
      { type: 'question', questionId: 'key-005' },
      {
        type: 'narrative',
        text: '基本操作を覚えました。次に、セッション中の高度な操作テクニックを学びましょう。',
      },
      { type: 'question', questionId: 'key-006' },
      { type: 'question', questionId: 'key-008' },
      {
        type: 'narrative',
        text: 'ショートカットを使いこなせるようになりました！最後に、複数行入力の方法を確認しましょう。',
      },
      { type: 'question', questionId: 'key-007' },
    ],
    completionMessage:
      'キーボード操作をマスターしました！ショートカットを活用すれば、Claude Codeでの作業速度が大幅に向上します。',
  },
  {
    id: 'scenario-session',
    title: '長時間セッションを効率的に管理する',
    description: 'コンテキスト管理・圧縮・再開のテクニックを実践で学ぶ',
    icon: '🕐',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '大規模なリファクタリングプロジェクトが始まりました。数時間にわたるセッションになりそうです。コンテキストが溢れないよう、効率的に管理する方法を学びましょう。',
      },
      { type: 'question', questionId: 'ses-003' },
      {
        type: 'narrative',
        text: 'セッションのリセット方法を覚えました。次に、コンテキストが長くなった時の圧縮テクニックを学びます。',
      },
      { type: 'question', questionId: 'cmd-003' },
      { type: 'question', questionId: 'ses-007' },
      {
        type: 'narrative',
        text: '圧縮も使いこなせるようになりました。明日続きをやる場合のセッション再開方法を確認しましょう。',
      },
      { type: 'question', questionId: 'ses-005' },
      { type: 'question', questionId: 'ses-008' },
    ],
    completionMessage:
      'セッション管理のテクニックを習得しました！長時間のプロジェクトでもコンテキストを効率的に管理できます。',
  },
  {
    id: 'scenario-tools',
    title: 'ツールを使い分けて作業を加速する',
    description: 'Read/Edit/Bash/Webツールの最適な使い分けを学ぶ',
    icon: '🔧',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: 'Claude Codeにはファイル操作、コマンド実行、Web検索など多彩なツールがあります。それぞれの使い分けを覚えて、Claudeの能力を最大限引き出しましょう。',
      },
      { type: 'question', questionId: 'tool-004' },
      { type: 'question', questionId: 'tool-003' },
      {
        type: 'narrative',
        text: 'ファイル操作ツールの使い分けを理解しました。次に、読み取りツールとWeb関連ツールの機能を確認しましょう。',
      },
      { type: 'question', questionId: 'tool-007' },
      { type: 'question', questionId: 'tool-006' },
      {
        type: 'narrative',
        text: 'ツールの基本を押さえました。最後に、MCPで追加できるツールについて学びましょう。',
      },
      { type: 'question', questionId: 'tool-010' },
    ],
    completionMessage:
      'ツールの使い分けをマスターしました！適切なツール選択で、Claude Codeの作業効率が格段に上がります。',
  },
  {
    id: 'scenario-security',
    title: '安全にClaude Codeを運用する',
    description: 'パーミッション・サンドボックス・フックで安全性を確保する',
    icon: '🔒',
    difficulty: 'advanced',
    steps: [
      {
        type: 'narrative',
        text: 'Claude Codeは強力なツールですが、適切な安全管理が必要です。パーミッション設定、セキュリティフック、権限管理のベストプラクティスを学びましょう。',
      },
      { type: 'question', questionId: 'ext-007' },
      {
        type: 'narrative',
        text: 'フックによるセキュリティ制御を理解しました。次に、パーミッション管理の方法を確認します。',
      },
      { type: 'question', questionId: 'bp-012' },
      { type: 'question', questionId: 'ext-010' },
      {
        type: 'narrative',
        text: 'パーミッションの設定を学びました。最後に、並列作業時の安全な運用方法を確認しましょう。',
      },
      { type: 'question', questionId: 'bp-011' },
      { type: 'question', questionId: 'bp-005' },
    ],
    completionMessage:
      'セキュリティと運用のベストプラクティスを習得しました！安全かつ効率的にClaude Codeを活用できます。',
  },
]
