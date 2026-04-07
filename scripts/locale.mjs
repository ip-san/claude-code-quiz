/**
 * スクリプト用のロケール定数（Node.js .mjs 環境）
 *
 * electron/locale.ts と同様、UI に表示される日本語文字列を一元管理する。
 * スクリプトから直接 import して使用する。
 */

export const scriptLocale = {
  collect: {
    tipRepeat: '💡 同じ指示の繰り返しが検出されました。CLAUDE.md にルール化すると効率的です',
    tipLongPrompt: '💡 長いプロンプトが多い傾向。CLAUDE.md に文脈を書けば自動で読み込まれます',
    tipTestAuto: '💡 テスト実行が多い傾向。PostToolUse hook で自動化できます',
    notifyWithTopics: (topics, count) => `${topics}に取り組んでいました。${count}問の復習を用意しました`,
    notifyGeneric: (count) => `${count}問の復習問題を用意しました`,
  },
  topics: {
    claudeMd: 'CLAUDE.mdの書き方',
    contextManagement: 'コンテキスト管理',
    subagent: 'サブエージェント',
    debug: 'デバッグ',
    test: 'テスト',
    cicd: 'CI/CD',
    security: 'セキュリティ',
    cost: 'コスト管理',
  },
}
