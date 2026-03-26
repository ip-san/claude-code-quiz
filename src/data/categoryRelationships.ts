/**
 * カテゴリ間の関連性定義（知識マップ用）
 */
export interface CategoryEdge {
  readonly from: string
  readonly to: string
  readonly label: string
}

export const CATEGORY_EDGES: readonly CategoryEdge[] = [
  { from: 'memory', to: 'bestpractices', label: 'CLAUDE.md活用' },
  { from: 'tools', to: 'commands', label: '実行手段' },
  { from: 'skills', to: 'tools', label: 'スキル→ツール' },
  { from: 'extensions', to: 'tools', label: '拡張ツール' },
  { from: 'session', to: 'memory', label: 'コンテキスト管理' },
  { from: 'keyboard', to: 'commands', label: 'ショートカット' },
  { from: 'bestpractices', to: 'session', label: '効率的な使い方' },
  { from: 'skills', to: 'extensions', label: 'MCP連携' },
]

/** 8カテゴリの配置座標（375px幅のSVG viewBox 300x360 向け） */
export const CATEGORY_POSITIONS: Record<string, { x: number; y: number }> = {
  memory: { x: 150, y: 40 },
  bestpractices: { x: 260, y: 90 },
  session: { x: 40, y: 90 },
  tools: { x: 260, y: 180 },
  keyboard: { x: 40, y: 180 },
  commands: { x: 260, y: 270 },
  skills: { x: 150, y: 320 },
  extensions: { x: 40, y: 270 },
}
