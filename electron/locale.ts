/**
 * Electron main process 用のロケール定数。
 * renderer 側の src/config/locales/ja.ts と同じ文言を維持すること。
 */
export const electronLocale = {
  export: {
    progressTitle: '学習進捗をエクスポート',
    csvTitle: 'CSV をエクスポート',
    importTitle: '学習進捗をインポート',
    fileTooLarge: (sizeKB: number) => `ファイルサイズが大きすぎます（最大1MB）。現在のサイズ: ${sizeKB}KB`,
  },
  recommend: {
    timeout: 'タイムアウトしました。もう一度お試しください。',
    cliNotFound: 'Claude Code CLI が見つかりません。インストールしてください。',
  },
  microQuiz: {
    titleWithQuestion: '💡 今の作業に役立つ問題',
    titleGeneric: '💡 関連するクイズがあります',
    bodyFallback: 'クイズで関連知識を確認してみませんか？',
  },
  topicKeywords: {
    claudeMd: 'CLAUDE.mdの書き方',
    contextManagement: 'コンテキスト管理',
    subagent: 'サブエージェント',
    debug: 'デバッグ',
    test: 'テスト',
    cicd: 'CI/CD',
    security: 'セキュリティ',
    cost: 'コスト管理',
  },
} as const
