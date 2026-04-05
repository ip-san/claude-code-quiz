/**
 * PWA ローカル通知 — SRS復習リマインダー
 *
 * Notification API を使い、Service Worker 不要のローカル通知。
 * アプリ起動時に通知許可を求め、バックグラウンドではスケジュール済み通知を使用。
 */

import { theme } from '@/config/theme'

const NOTIFICATION_KEY = `${theme.storagePrefix}-notification-permission`
const REMINDER_KEY = `${theme.storagePrefix}-reminder-scheduled`

export class NotificationService {
  /**
   * 通知がサポートされているか
   */
  static isSupported(): boolean {
    return 'Notification' in window
  }

  /**
   * 通知許可の状態
   */
  static getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission
  }

  /**
   * 通知許可をリクエスト
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const result = await Notification.requestPermission()
    try {
      localStorage.setItem(NOTIFICATION_KEY, result)
    } catch {
      /* ignore */
    }
    return result === 'granted'
  }

  /**
   * SRS復習リマインダー通知を送信
   */
  static showReviewReminder(dueCount: number): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return
    if (dueCount === 0) return

    new Notification(theme.appName, {
      body: `🧠 復習待ちの問題が${dueCount}問あります`,
      icon: '/claude-code-quiz/icons/icon-192.png',
      tag: 'srs-review', // 重複通知を防止
      requireInteraction: false,
    })
  }

  /**
   * 今日のリマインダーをスケジュール（簡易実装: setTimeout ベース）
   * アプリがフォアグラウンドで開いている間のみ有効
   */
  static scheduleEveningReminder(dueCount: number): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return
    if (dueCount === 0) return

    // 今日すでにスケジュール済みならスキップ
    const today = new Date().toISOString().slice(0, 10)
    try {
      if (localStorage.getItem(REMINDER_KEY) === today) return
      localStorage.setItem(REMINDER_KEY, today)
    } catch {
      /* ignore */
    }

    // 20:00 にリマインダー（すでに過ぎていたらスキップ）
    const now = new Date()
    const evening = new Date(now)
    evening.setHours(20, 0, 0, 0)

    const delay = evening.getTime() - now.getTime()
    if (delay <= 0) return

    setTimeout(() => {
      this.showReviewReminder(dueCount)
    }, delay)
  }

  /**
   * ユーザーがまだ通知許可を求められていないかチェック
   */
  static shouldAskPermission(): boolean {
    if (!this.isSupported()) return false
    if (Notification.permission !== 'default') return false
    // 一度拒否された後に再度聞かない
    try {
      return localStorage.getItem(NOTIFICATION_KEY) !== 'denied'
    } catch {
      return true
    }
  }
}
