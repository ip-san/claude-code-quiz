/**
 * TopicTag Value Object
 *
 * ドキュメントページに対応するトピックタグを管理する。
 * 問題の `tags` フィールドに `topic-xxx` 形式で付与され、
 * カテゴリ横断的な概念グループとして機能する。
 *
 * 【既存タグとの違い】
 * - overview / overview-NNN / overview-ch-N: 全体像モード専用
 * - topic-xxx: ドキュメントページ対応のトピック分類
 */

export interface TopicTag {
  readonly id: string       // "topic-sub-agents"
  readonly name: string     // 日本語表示名
  readonly icon: string
  readonly docPage: string  // "sub-agents" (referenceUrl のパス部分)
}

export const PREDEFINED_TOPIC_TAGS: readonly TopicTag[] = Object.freeze([
  { id: 'topic-overview', name: '概要', icon: '📖', docPage: 'overview' },
  { id: 'topic-quickstart', name: 'クイックスタート', icon: '🚀', docPage: 'quickstart' },
  { id: 'topic-settings', name: '設定', icon: '⚙️', docPage: 'settings' },
  { id: 'topic-memory', name: 'Memory', icon: '📝', docPage: 'memory' },
  { id: 'topic-interactive-mode', name: 'インタラクティブ', icon: '💬', docPage: 'interactive-mode' },
  { id: 'topic-how-claude-code-works', name: '動作原理', icon: '🧠', docPage: 'how-claude-code-works' },
  { id: 'topic-mcp', name: 'MCP', icon: '🔌', docPage: 'mcp' },
  { id: 'topic-hooks', name: 'Hooks', icon: '🪝', docPage: 'hooks' },
  { id: 'topic-discover-plugins', name: 'Plugins', icon: '🔍', docPage: 'discover-plugins' },
  { id: 'topic-sub-agents', name: 'Sub-agents', icon: '🤖', docPage: 'sub-agents' },
  { id: 'topic-common-workflows', name: 'ワークフロー', icon: '🔄', docPage: 'common-workflows' },
  { id: 'topic-checkpointing', name: 'Checkpointing', icon: '💾', docPage: 'checkpointing' },
  { id: 'topic-best-practices', name: 'ベストプラクティス', icon: '💡', docPage: 'best-practices' },
  { id: 'topic-skills', name: 'Skills', icon: '✨', docPage: 'skills' },
])

/**
 * トピックタグIDからTopicTagを取得
 */
export function getTopicTagById(id: string): TopicTag | null {
  return PREDEFINED_TOPIC_TAGS.find(t => t.id === id) ?? null
}

/**
 * 問題のtagsからトピックタグのみを抽出
 */
export function getTopicTagsFromQuestionTags(tags: readonly string[]): TopicTag[] {
  return tags
    .filter(t => t.startsWith('topic-'))
    .map(t => getTopicTagById(t))
    .filter((t): t is TopicTag => t !== null)
}

/**
 * ドキュメントページパスからトピックタグIDを導出
 */
export function getTopicTagIdFromDocPage(docPage: string): string | null {
  const tag = PREDEFINED_TOPIC_TAGS.find(t => t.docPage === docPage)
  return tag ? tag.id : null
}
