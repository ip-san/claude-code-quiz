/**
 * 共通スタイル定数
 *
 * ダークモード対応のクラス名パターンを1箇所で管理。
 * コンポーネントで直接 className を書く代わりにこの定数を使うことで、
 * ダークモードの漏れを防ぐ。
 *
 * 使い方:
 * import { cardStyles, textStyles } from '@/lib/styles'
 * <div className={cardStyles.base}>
 */

/** カード（白背景 + ボーダー） */
export const cardStyles = {
  /** 標準カード: 白背景 + stone-200 ボーダー */
  base: 'rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800',
  /** shadow 付き */
  elevated: 'rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800',
  /** パディング込み */
  padded: 'rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800',
} as const

/** テキスト色 */
export const textStyles = {
  /** 本文（主要テキスト） */
  primary: 'text-claude-dark',
  /** 補足テキスト */
  secondary: 'text-stone-500 dark:text-stone-400',
  /** 薄いテキスト（ラベル、ヒント） */
  muted: 'text-stone-400 dark:text-stone-500',
  /** 説明文 */
  body: 'text-stone-600 dark:text-stone-300',
} as const

/** ボタン */
export const buttonStyles = {
  /** プライマリ（オレンジ） */
  primary: 'tap-highlight rounded-2xl bg-claude-orange px-6 py-3.5 text-base font-semibold text-white',
  /** セカンダリ（ボーダー） */
  secondary: 'tap-highlight rounded-2xl border border-stone-300 px-6 py-3.5 text-base font-semibold text-stone-600 dark:border-stone-600 dark:text-stone-300',
  /** ゴースト（テキストのみ） */
  ghost: 'tap-highlight rounded-full p-2 text-stone-500',
} as const

/** インプット */
export const inputStyles = {
  base: 'w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-claude-dark outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200',
} as const

/** ページ背景 */
export const pageStyles = {
  /** メニュー画面背景 */
  cream: 'bg-claude-cream dark:bg-stone-900',
  /** クイズ画面背景 */
  quiz: 'bg-stone-100 dark:bg-stone-900 sm:bg-claude-cream',
} as const

/** ヘッダー */
export const headerStyles = {
  sticky: 'sticky top-0 z-10 border-b border-stone-200 bg-claude-cream/95 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95',
} as const

/** ボトムバー */
export const bottomBarStyles = {
  fixed: 'fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95',
} as const
