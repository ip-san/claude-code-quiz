/**
 * keyboard ダイアグラムの構造検証（生成側・適用側で共有）。
 *
 * src/infrastructure/validation/QuizValidator.ts の Zod スキーマ
 * （KeyComboSchema: keys min(1).max(4) / KeyboardDiagramSchema: combos min(1).max(6)）
 * と同じ下限・上限を課す。.mjs から TS の Zod を import できないため同等条件を複製している。
 * これにより「不正/上限超過の図」を generate(出力前) と apply(適用前) の双方で弾き、
 * ランタイムの QuizValidator まで検出が遅れるのを防ぐ。
 * Zod 側の min/max を変更した場合はここも同期すること。
 */
export function isValidKbDiagram(d) {
  return (
    d &&
    typeof d === 'object' &&
    Array.isArray(d.combos) &&
    d.combos.length >= 1 &&
    d.combos.length <= 6 &&
    d.combos.every(
      (c) =>
        c &&
        Array.isArray(c.keys) &&
        c.keys.length >= 1 &&
        c.keys.length <= 4 &&
        c.keys.every((k) => k && typeof k.label === 'string' && k.label.length > 0)
    )
  )
}
