/**
 * QuizStore Import Integration Tests
 *
 * Store の importQuizzes アクションのテスト。
 * 実際のデータフローをテストし、状態の変更を検証する。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useQuizStore } from './quizStore'
import { VALID_FIXTURES, INVALID_FIXTURES } from '../__fixtures__/import'

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('QuizStore Import Integration', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset store to initial state
    useQuizStore.setState({
      importError: null,
      viewState: 'menu',
    })
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('importQuizzes()', () => {
    describe('正常系: 有効なJSONのインポート', () => {
      it('最小構成のJSONをインポートして状態が更新される', async () => {
        const store = useQuizStore.getState()
        const jsonString = JSON.stringify(VALID_FIXTURES.minimal)

        const result = await store.importQuizzes(jsonString)

        expect(result).toBe(true)

        const newState = useQuizStore.getState()
        expect(newState.importError).toBeNull()
        expect(newState.allQuestions.length).toBe(1)
        expect(newState.isDefaultData).toBe(false)
      })

      it('フル構成のJSONをインポートして問題数が正しい', async () => {
        const store = useQuizStore.getState()
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        await store.importQuizzes(jsonString)

        const newState = useQuizStore.getState()
        expect(newState.allQuestions.length).toBe(3)
      })

      it('インポート後にアクティブセット情報が更新される', async () => {
        const store = useQuizStore.getState()
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        await store.importQuizzes(jsonString)

        const newState = useQuizStore.getState()
        expect(newState.activeSetInfo).not.toBeNull()
        expect(newState.activeSetInfo?.title).toBe('テストクイズセット')
        expect(newState.activeSetInfo?.type).toBe('user')
        expect(newState.activeSetInfo?.isActive).toBe(true)
      })

      it('インポート後にavailableSetsが更新される', async () => {
        const store = useQuizStore.getState()
        const jsonString = JSON.stringify(VALID_FIXTURES.minimal)

        await store.importQuizzes(jsonString)

        const newState = useQuizStore.getState()
        // デフォルト + インポートしたセット
        expect(newState.availableSets.length).toBeGreaterThanOrEqual(2)

        const importedSet = newState.availableSets.find(s => s.type === 'user')
        expect(importedSet).toBeDefined()
      })

      it('配列形式のJSONもインポートできる', async () => {
        const store = useQuizStore.getState()
        const jsonString = JSON.stringify(VALID_FIXTURES.arrayFormat)

        const result = await store.importQuizzes(jsonString)

        expect(result).toBe(true)

        const newState = useQuizStore.getState()
        expect(newState.allQuestions.length).toBe(1)
        expect(newState.allQuestions[0].id).toBe('array-001')
      })

      it('インポート後にviewStateがmenuになる', async () => {
        const store = useQuizStore.getState()
        useQuizStore.setState({ viewState: 'quiz' }) // 別の状態に設定
        const jsonString = JSON.stringify(VALID_FIXTURES.minimal)

        await store.importQuizzes(jsonString)

        const newState = useQuizStore.getState()
        expect(newState.viewState).toBe('menu')
      })
    })

    describe('異常系: 不正なJSONのインポート', () => {
      it('JSONシンタックスエラーでfalseを返しエラーが設定される', async () => {
        const store = useQuizStore.getState()

        const result = await store.importQuizzes(INVALID_FIXTURES.syntax)

        expect(result).toBe(false)

        const newState = useQuizStore.getState()
        expect(newState.importError).not.toBeNull()
        expect(newState.importError).toContain('バリデーションエラー')
      })

      it('必須フィールド欠落でエラーメッセージが詳細', async () => {
        const store = useQuizStore.getState()

        await store.importQuizzes(INVALID_FIXTURES.missingRequired)

        const newState = useQuizStore.getState()
        expect(newState.importError).toContain('explanation')
        expect(newState.importError).toContain('category')
        expect(newState.importError).toContain('difficulty')
      })

      it('correctIndex範囲外でエラーが設定される', async () => {
        const store = useQuizStore.getState()

        await store.importQuizzes(INVALID_FIXTURES.correctIndexOutOfBounds)

        const newState = useQuizStore.getState()
        expect(newState.importError).toContain('correctIndex')
      })

      it('選択肢数違反でエラーが設定される', async () => {
        const store = useQuizStore.getState()

        await store.importQuizzes(INVALID_FIXTURES.tooFewOptions)

        const newState = useQuizStore.getState()
        expect(newState.importError).toContain('options')
      })

      it('空のクイズ配列でエラーが設定される', async () => {
        const store = useQuizStore.getState()

        await store.importQuizzes(INVALID_FIXTURES.emptyQuizzes)

        const newState = useQuizStore.getState()
        expect(newState.importError).not.toBeNull()
      })

      it('不正な難易度でエラーが設定される', async () => {
        const store = useQuizStore.getState()

        await store.importQuizzes(INVALID_FIXTURES.invalidDifficulty)

        const newState = useQuizStore.getState()
        expect(newState.importError).toContain('difficulty')
      })

      it('エラー後に再度インポートするとエラーがクリアされる', async () => {
        const store = useQuizStore.getState()

        // 最初に不正なJSONをインポート
        await store.importQuizzes(INVALID_FIXTURES.syntax)
        expect(useQuizStore.getState().importError).not.toBeNull()

        // 次に有効なJSONをインポート
        await store.importQuizzes(JSON.stringify(VALID_FIXTURES.minimal))

        const newState = useQuizStore.getState()
        expect(newState.importError).toBeNull()
      })

      it('エラー時にallQuestionsは変更されない', async () => {
        const store = useQuizStore.getState()
        const initialQuestions = [...useQuizStore.getState().allQuestions]

        await store.importQuizzes(INVALID_FIXTURES.syntax)

        const newState = useQuizStore.getState()
        expect(newState.allQuestions.length).toBe(initialQuestions.length)
      })
    })

    describe('連続インポート', () => {
      it('複数回インポートで最後のセットがアクティブになる', async () => {
        const store = useQuizStore.getState()

        await store.importQuizzes(JSON.stringify(VALID_FIXTURES.minimal))
        // IDがタイムスタンプベースのため、十分な時間待機して異なるIDを生成
        await new Promise(resolve => setTimeout(resolve, 10))
        await store.importQuizzes(JSON.stringify(VALID_FIXTURES.full))

        const newState = useQuizStore.getState()
        expect(newState.activeSetInfo?.title).toBe('テストクイズセット')
        expect(newState.allQuestions.length).toBe(3)
      })
    })
  })

  describe('restoreDefault()', () => {
    it('インポート後にデフォルトに戻せる', async () => {
      const store = useQuizStore.getState()

      // まずインポート
      await store.importQuizzes(JSON.stringify(VALID_FIXTURES.minimal))
      expect(useQuizStore.getState().isDefaultData).toBe(false)

      // デフォルトに戻す
      await store.restoreDefault()

      const newState = useQuizStore.getState()
      expect(newState.isDefaultData).toBe(true)
      expect(newState.activeSetInfo?.type).toBe('default')
    })
  })

  describe('switchQuizSet()', () => {
    it('インポートしたセットとデフォルトを切り替えられる', async () => {
      const store = useQuizStore.getState()

      // インポート
      await store.importQuizzes(JSON.stringify(VALID_FIXTURES.full))
      const importedSetId = useQuizStore.getState().activeSetInfo?.id

      // デフォルトに切り替え
      await store.switchQuizSet('default')
      expect(useQuizStore.getState().activeSetInfo?.type).toBe('default')

      // インポートしたセットに戻す
      if (importedSetId) {
        await store.switchQuizSet(importedSetId)
        expect(useQuizStore.getState().activeSetInfo?.id).toBe(importedSetId)
      }
    })
  })

  describe('deleteUserSet()', () => {
    it('インポートしたセットを削除できる', async () => {
      const store = useQuizStore.getState()

      // インポート
      await store.importQuizzes(JSON.stringify(VALID_FIXTURES.minimal))
      const importedSetId = useQuizStore.getState().activeSetInfo?.id
      expect(importedSetId).toBeDefined()

      // 削除
      await store.deleteUserSet(importedSetId!)

      const newState = useQuizStore.getState()
      // 削除後はデフォルトに戻る
      expect(newState.activeSetInfo?.type).toBe('default')

      // availableSetsから削除されている
      const deletedSet = newState.availableSets.find(s => s.id === importedSetId)
      expect(deletedSet).toBeUndefined()
    })
  })
})
