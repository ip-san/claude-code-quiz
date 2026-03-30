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
}

export function migrateQuestionIds(json: string): string {
  let migrated = json
  for (const [oldId, newId] of Object.entries(ID_MIGRATIONS)) {
    migrated = migrated.replace(new RegExp(`"${oldId}"`, 'g'), `"${newId}"`)
  }
  return migrated
}
