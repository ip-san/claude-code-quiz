/**
 * ID Migration: gs- prefix → proper category prefix
 *
 * Legacy gs- (getting-started) IDs were renamed to follow the
 * standard category prefix convention (bp-, ses-, cmd-, mem-).
 * This migration updates localStorage data for existing users.
 */

const ID_MIGRATIONS: Record<string, string> = {
  'gs-001': 'bp-082',
  'gs-002': 'bp-083',
  'gs-003': 'ses-166',
  'gs-005': 'ses-167',
  'gs-006': 'ses-168',
  'gs-007': 'bp-084',
  'gs-008': 'bp-085',
  'gs-009': 'bp-086',
  'gs-010': 'cmd-103',
  'gs-011': 'mem-053',
  // 2026-04-25: SDK & Platform カテゴリ新設に伴う移動
  // 進捗・ブックマーク・履歴の保持用。順序重要 — 上の gs-005→ses-167 を経由して sdk-006 へ
  'ses-069': 'sdk-001',
  'cmd-050': 'sdk-002',
  'ses-080': 'sdk-003',
  'ses-087': 'sdk-004',
  'ses-097': 'sdk-005',
  'ses-167': 'sdk-006',
  'ext-113': 'sdk-007',
  'ext-114': 'sdk-008',
  'ext-115': 'sdk-009',
  'ext-116': 'sdk-010',
  'ext-117': 'sdk-011',
  'ext-118': 'sdk-012',
  'ext-119': 'sdk-013',
  'ext-120': 'sdk-014',
}

export function migrateQuestionIds(json: string): string {
  let migrated = json
  for (const [oldId, newId] of Object.entries(ID_MIGRATIONS)) {
    migrated = migrated.replace(new RegExp(`"${oldId}"`, 'g'), `"${newId}"`)
  }
  return migrated
}
