/**
 * 価値補正定数（.mjs 側の単一情報源）。
 *
 * src/domain/valueObjects/ValueScore.ts の TS 定数（VALUE_TAG_BONUS / DEFAULT_CATEGORY_WEIGHT）
 * と同値に保つこと。TS↔mjs 境界で import 不可のため複製しているが、
 * 両側にテスト（ValueScore.test.ts / value-constants.test.mjs）を置き、
 * 片側だけの変更を CI で検知できるようにしている。
 */

/** practical/trivia タグによる価値補正（加点）。ValueScore.ts の VALUE_TAG_BONUS と同値 */
export const VALUE_TAG_BONUS_MJS = { practical: 6, trivia: -4 }

/** カテゴリ weight 未設定時の既定値。ValueScore.ts の DEFAULT_CATEGORY_WEIGHT と同値 */
export const VALUE_DEFAULT_WEIGHT = 10
