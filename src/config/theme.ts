/**
 * テーマ設定 — アプリのブランド・カテゴリ・テキストを一元管理
 *
 * このファイルを差し替えるだけで、別の技術テーマのクイズアプリとして動作する。
 * quizzes.json のカテゴリIDと categories のキーが一致していれば OK。
 */

export interface ThemeCategory {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly color: string
  readonly weight: number
  /** カテゴリ正解時に表示する「身につけたスキル」の説明 */
  readonly skillDescription: string
}

export interface ThemeMasteryLevel {
  readonly name: string
  readonly icon: string
  readonly color: string
  readonly bg: string
  readonly req: string | null
}

export interface ThemeConfig {
  /** アプリ名（フル） */
  readonly appName: string
  /** アプリ名（短縮、PWA用） */
  readonly appShortName: string
  /** ロゴテキスト（ウェルカム画面のアイコン内） */
  readonly logoText: string
  /** テーマ主題（AIプロンプトの接頭辞） */
  readonly subject: string
  /** キャッチフレーズ */
  readonly tagline: string
  /** サブキャッチ */
  readonly subtitle: string
  /** 証明書タイトル */
  readonly certificateTitle: string
  /** 証明書フッター */
  readonly certificateFooter: string
  /** 全体像モード証明書説明 */
  readonly certificateDescOverview: string
  /** 実力テスト証明書説明 */
  readonly certificateDescFull: string
  /** 公式ドキュメントURL（結果画面の「始める」リンク） */
  readonly officialDocsUrl: string
  /** 公式ドキュメントのリンクテキスト */
  readonly officialDocsLabel: string
  /** PWA URL（シェアメッセージ用） */
  readonly pwaUrl: string
  /** シェアメッセージのハッシュタグ */
  readonly shareHashtags: string
  /** カテゴリ定義 */
  readonly categories: readonly ThemeCategory[]
  /** マスタリーレベル定義 */
  readonly masteryLevels: readonly ThemeMasteryLevel[]
  /** ウェルカム画面の特徴リスト */
  readonly welcomeFeatures: readonly {
    readonly iconColor: string
    readonly title: string
    readonly desc: string
  }[]
  /** チーム共有メッセージテンプレート（${percentage} でスコアを差し込み） */
  readonly teamShareTemplate: string
  /** チーム共有アクションステップ */
  readonly teamShareSteps: readonly string[]
  /** localStorage キーのプレフィックス */
  readonly storagePrefix: string
  /** 全体像モードのチャプター定義 */
  readonly overviewChapters: readonly {
    readonly id: number
    readonly name: string
    readonly subtitle: string
    readonly icon: string
    readonly actionItem: string
  }[]
}

// ============================================================
// Claude Code テーマ（デフォルト）
// ============================================================

const claudeCodeTheme: ThemeConfig = {
  appName: 'Claude Code Quiz',
  appShortName: 'CC Quiz',
  logoText: 'CC',
  subject: 'Claude Code',
  tagline: 'AI 時代のスキルを、今日から身につける',
  subtitle: '経験不問 | 630問 | スマホでいつでも',
  certificateTitle: 'Claude Code Quiz Master Certification',
  certificateFooter: 'Powered by Claude Code Quiz',
  certificateDescOverview: 'Claude Code の全体像を習得したことを証明します',
  certificateDescFull: 'Claude Code の機能と使い方に関する実力テストに合格しました',
  officialDocsUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  officialDocsLabel: 'Claude Code を始める',
  pwaUrl: 'https://ip-san.github.io/claude-code-quiz/',
  shareHashtags: '#ClaudeCode #AI駆動開発 #DX推進',
  categories: [
    {
      id: 'memory',
      name: 'Memory (CLAUDE.md)',
      icon: '📝',
      color: 'blue',
      weight: 15,
      description: 'CLAUDE.md、@インポート、.claude/rules/による永続的なコンテキスト管理',
      skillDescription: 'プロジェクト文脈を記憶させられる',
    },
    {
      id: 'skills',
      name: 'Skills',
      icon: '✨',
      color: 'purple',
      weight: 15,
      description: 'スキル作成、frontmatter設定、動的コンテキスト注入',
      skillDescription: 'AI ワークフローを作れる',
    },
    {
      id: 'tools',
      name: 'Tools',
      icon: '🔧',
      color: 'orange',
      weight: 15,
      description: 'Read/Write/Edit/Bash/Glob/Grep等の組み込みツール',
      skillDescription: 'ファイル操作・検索を自動化できる',
    },
    {
      id: 'commands',
      name: 'Commands',
      icon: '💻',
      color: 'emerald',
      weight: 15,
      description: '/context、/compact、/init、!prefix等のコマンド操作',
      skillDescription: '対話を効率的にコントロールできる',
    },
    {
      id: 'extensions',
      name: 'Extensions',
      icon: '🧩',
      color: 'pink',
      weight: 15,
      description: 'MCP、Hooks、Subagents、Pluginsによる拡張機能',
      skillDescription: 'MCP・プラグインで拡張できる',
    },
    {
      id: 'session',
      name: 'Session & Context',
      icon: '📚',
      color: 'cyan',
      weight: 10,
      description: 'セッション管理、コンテキストウィンドウ、fork操作',
      skillDescription: 'セッション管理を安全に行える',
    },
    {
      id: 'keyboard',
      name: 'Keyboard & UI',
      icon: '⌨️',
      color: 'yellow',
      weight: 10,
      description: 'ショートカット、Vimモード、UI操作',
      skillDescription: 'ショートカットで素早く操作',
    },
    {
      id: 'bestpractices',
      name: 'Best Practices',
      icon: '💡',
      color: 'green',
      weight: 10,
      description: '効果的な使い方、プロンプト設計、ワークフロー',
      skillDescription: '実務で成果を出せる',
    },
  ],
  masteryLevels: [
    { name: 'AI入門者', icon: '🌱', color: 'text-claude-orange', bg: 'bg-claude-orange/10', req: null },
    { name: 'AI学習者', icon: '📚', color: 'text-blue-600', bg: 'bg-blue-500/10', req: '正答率50%以上' },
    { name: 'AI実践者', icon: '🚀', color: 'text-green-600', bg: 'bg-green-500/10', req: '正答率70%以上' },
    { name: 'AI推進者', icon: '⚡', color: 'text-purple-600', bg: 'bg-purple-500/10', req: '正答率80% + 半数以上学習' },
    {
      name: 'AI牽引役',
      icon: '👑',
      color: 'text-yellow-600',
      bg: 'bg-yellow-500/10',
      req: '正答率85% + 全カテゴリ習得',
    },
  ],
  welcomeFeatures: [
    {
      iconColor: 'text-claude-orange',
      title: '知識ゼロから始められる',
      desc: 'AI を使ったことがなくても大丈夫。基礎から順番にガイドします',
    },
    {
      iconColor: 'text-blue-500',
      title: '1問ずつ、確実に身につく',
      desc: '解説付きのクイズで「わかった」を積み重ねていきましょう',
    },
    {
      iconColor: 'text-green-500',
      title: 'あなたのペースで成長',
      desc: 'スマホでいつでも学習。毎日少しずつで、着実にスキルアップ',
    },
  ],
  teamShareTemplate: `Claude Code Quiz で AI コーディングアシスタントの基本を学びました（正答率 \${percentage}%）。

チームで AI 駆動開発を始めるために、まずこの3つから取り組みませんか？

1. 各自が Claude Code Quiz を完了する（スマホで10分）
2. プロジェクトに CLAUDE.md を作成して開発ルールを共有する
3. 週1回「AI で何を自動化できたか」を共有する場を設ける

クイズはこちら → https://ip-san.github.io/claude-code-quiz/

#ClaudeCode #AI駆動開発 #DX推進`,
  teamShareSteps: [
    'チームメンバーにこのクイズを共有する',
    'プロジェクトに CLAUDE.md を作成してルールを統一する',
    '週1回「AIで何を自動化できたか」共有会を設ける',
  ],
  storagePrefix: 'claude-code-quiz',
  overviewChapters: [
    {
      id: 1,
      name: 'はじめの一歩',
      subtitle: 'AI アシスタントとは何か、何ができるか',
      icon: '👋',
      actionItem: 'Claude Code をインストールして、「このプロジェクトの構成を教えて」と聞いてみる',
    },
    {
      id: 2,
      name: 'AI に記憶させる',
      subtitle: 'プロジェクトの文脈を AI が覚えてくれる仕組み',
      icon: '📝',
      actionItem: 'プロジェクトのルートに CLAUDE.md を作り、開発ルールを3行書いてみる',
    },
    {
      id: 3,
      name: 'AI に作業を任せる',
      subtitle: 'ファイル操作やコマンド実行を AI が代行する',
      icon: '🔧',
      actionItem: '普段手作業でやっているファイル修正を1つ、Claude Code に頼んでみる',
    },
    {
      id: 4,
      name: '安全に使いこなす',
      subtitle: '権限管理やセキュリティの基本を押さえる',
      icon: '🔒',
      actionItem: '.claude/settings.json を確認し、チームに合った権限設定を1つ追加する',
    },
    {
      id: 5,
      name: '自分だけの AI を作る',
      subtitle: '拡張機能で AI をチームの業務に合わせる',
      icon: '🧩',
      actionItem: 'チームの定型作業を1つ選び、スラッシュコマンド（スキル）として定義してみる',
    },
    {
      id: 6,
      name: '現場で活かす',
      subtitle: '実務で成果を出すためのベストプラクティス',
      icon: '🚀',
      actionItem: '今週のタスクを1つ選び、Claude Code と一緒に完了させてみる',
    },
  ],
}

// ============================================================
// アクティブテーマ
// ============================================================

/** 現在のテーマ設定。別テーマに切り替える場合はここを差し替える */
export const theme: ThemeConfig = claudeCodeTheme

/** テーマからカテゴリ数を取得するヘルパー */
export function getCategoryCount(): number {
  return theme.categories.length
}

/** カテゴリIDからスキル説明を取得 */
export function getSkillDescription(categoryId: string): string {
  return theme.categories.find((c) => c.id === categoryId)?.skillDescription ?? ''
}
