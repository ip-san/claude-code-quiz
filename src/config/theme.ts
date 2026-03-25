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
    { id: 'memory', name: 'Memory (CLAUDE.md)', description: 'CLAUDE.md、@インポート、.claude/rules/による永続的なコンテキスト管理', icon: '📝', color: 'blue', weight: 15, skillDescription: 'プロジェクト文脈を記憶させられる' },
    { id: 'skills', name: 'Skills', description: 'スキル作成、frontmatter設定、動的コンテキスト注入', icon: '✨', color: 'purple', weight: 15, skillDescription: 'AI ワークフローを作れる' },
    { id: 'tools', name: 'Tools', description: 'Read/Write/Edit/Bash/Glob/Grep等の組み込みツール', icon: '🔧', color: 'orange', weight: 15, skillDescription: 'ファイル操作・検索を自動化できる' },
    { id: 'commands', name: 'Commands', description: '/context、/compact、/init、!prefix等のコマンド操作', icon: '💻', color: 'emerald', weight: 15, skillDescription: '対話を効率的にコントロールできる' },
    { id: 'extensions', name: 'Extensions', description: 'MCP、Hooks、Subagents、Pluginsによる拡張機能', icon: '🧩', color: 'pink', weight: 15, skillDescription: 'MCP・プラグインで拡張できる' },
    { id: 'session', name: 'Session & Context', description: 'セッション管理、コンテキストウィンドウ、fork操作', icon: '📚', color: 'cyan', weight: 10, skillDescription: 'セッション管理を安全に行える' },
    { id: 'keyboard', name: 'Keyboard & UI', description: 'ショートカット、Vimモード、UI操作', icon: '⌨️', color: 'yellow', weight: 10, skillDescription: 'ショートカットで素早く操作' },
    { id: 'bestpractices', name: 'Best Practices', description: '効果的な使い方、プロンプト設計、ワークフロー', icon: '💡', color: 'green', weight: 10, skillDescription: '実務で成果を出せる' },
  ],
  masteryLevels: [
    { name: 'AI入門者', icon: '🌱', color: 'text-claude-orange', bg: 'bg-claude-orange/10', req: null },
    { name: 'AI学習者', icon: '📚', color: 'text-blue-600', bg: 'bg-blue-500/10', req: '正答率50%以上' },
    { name: 'AI実践者', icon: '🚀', color: 'text-green-600', bg: 'bg-green-500/10', req: '正答率70%以上' },
    { name: 'AI推進者', icon: '⚡', color: 'text-purple-600', bg: 'bg-purple-500/10', req: '正答率80% + 半数以上学習' },
    { name: 'AI牽引役', icon: '👑', color: 'text-yellow-600', bg: 'bg-yellow-500/10', req: '正答率85% + 全カテゴリ習得' },
  ],
  welcomeFeatures: [
    { iconColor: 'text-claude-orange', title: '知識ゼロから始められる', desc: 'AI を使ったことがなくても大丈夫。基礎から順番にガイドします' },
    { iconColor: 'text-blue-500', title: '1問ずつ、確実に身につく', desc: '解説付きのクイズで「わかった」を積み重ねていきましょう' },
    { iconColor: 'text-green-500', title: 'あなたのペースで成長', desc: 'スマホでいつでも学習。毎日少しずつで、着実にスキルアップ' },
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
  return theme.categories.find(c => c.id === categoryId)?.skillDescription ?? ''
}
