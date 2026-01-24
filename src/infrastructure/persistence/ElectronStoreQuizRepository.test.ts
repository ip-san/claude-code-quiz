/**
 * ElectronStoreQuizRepository Integration Tests
 *
 * インポート機能を中心とした統合テスト。
 * localStorage をモックして、実際のデータフローをテストする。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ElectronStoreQuizRepository } from './ElectronStoreQuizRepository'
import { VALID_FIXTURES, INVALID_FIXTURES } from '../../__fixtures__/import'

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

describe('ElectronStoreQuizRepository', () => {
  let repository: ElectronStoreQuizRepository

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    repository = new ElectronStoreQuizRepository()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('importFromJson()', () => {
    describe('正常系: 有効なJSONのインポート', () => {
      it('最小構成のJSONをインポートできる', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.minimal)

        const result = await repository.importFromJson(jsonString)

        expect(result).not.toBeNull()
        expect(result!.type).toBe('user')
        expect(result!.getQuestionCount()).toBe(1)
        expect(result!.questions[0].id).toBe('test-001')
      })

      it('全フィールドを含むJSONをインポートできる', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        const result = await repository.importFromJson(jsonString)

        expect(result).not.toBeNull()
        expect(result!.title).toBe('テストクイズセット')
        expect(result!.description).toBe('インポートテスト用のクイズセット')
        expect(result!.getQuestionCount()).toBe(3)
      })

      it('配列形式のJSONをインポートできる', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.arrayFormat)

        const result = await repository.importFromJson(jsonString)

        expect(result).not.toBeNull()
        expect(result!.getQuestionCount()).toBe(1)
        expect(result!.questions[0].id).toBe('array-001')
      })

      it('インポート後にlocalStorageに保存される', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.minimal)

        await repository.importFromJson(jsonString)

        expect(localStorageMock.setItem).toHaveBeenCalled()
        const savedData = localStorageMock.setItem.mock.calls.find(
          call => call[0] === 'claude-code-quiz-user-sets'
        )
        expect(savedData).toBeDefined()
      })

      it('インポートしたセットがユーザーセット一覧に追加される', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        await repository.importFromJson(jsonString)
        const userSets = await repository.getUserSets()

        expect(userSets.length).toBe(1)
        expect(userSets[0].title).toBe('テストクイズセット')
      })

      it('複数回インポートすると複数のセットが保存される', async () => {
        await repository.importFromJson(JSON.stringify(VALID_FIXTURES.minimal))
        // IDがタイムスタンプベースのため、十分な時間待機して異なるIDを生成
        await new Promise(resolve => setTimeout(resolve, 10))
        await repository.importFromJson(JSON.stringify(VALID_FIXTURES.full))

        const userSets = await repository.getUserSets()

        expect(userSets.length).toBe(2)
      })

      it('インポートしたセットのIDは user- で始まる', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.minimal)

        const result = await repository.importFromJson(jsonString)

        expect(result!.id).toMatch(/^user-\d+$/)
      })
    })

    describe('異常系: 不正なJSONのインポート', () => {
      it('JSONシンタックスエラーで例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.syntax)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('必須フィールド欠落で例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.missingRequired)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('型エラーで例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.wrongTypes)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('correctIndex範囲外で例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.correctIndexOutOfBounds)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('選択肢が少なすぎると例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.tooFewOptions)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('選択肢が多すぎると例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.tooManyOptions)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('空のクイズ配列で例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.emptyQuizzes)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('不正な難易度で例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.invalidDifficulty)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('不正なURLで例外をスローする', async () => {
        await expect(
          repository.importFromJson(INVALID_FIXTURES.invalidUrl)
        ).rejects.toThrow('バリデーションエラー')
      })

      it('不正なインポートでもlocalStorageは変更されない', async () => {
        const initialCallCount = localStorageMock.setItem.mock.calls.length

        try {
          await repository.importFromJson(INVALID_FIXTURES.syntax)
        } catch {
          // Expected to throw
        }

        // setItem should not have been called for user sets
        const userSetsCalls = localStorageMock.setItem.mock.calls.filter(
          call => call[0] === 'claude-code-quiz-user-sets'
        )
        expect(userSetsCalls.length).toBe(initialCallCount)
      })
    })

    describe('データ整合性', () => {
      it('インポートした問題の全フィールドが正しく保存される', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        const result = await repository.importFromJson(jsonString)
        const question = result!.questions[0]

        expect(question.id).toBe('full-001')
        expect(question.question).toBe('Claude Code でファイルを読むコマンドは？')
        expect(question.options.length).toBe(4)
        expect(question.correctIndex).toBe(1)
        expect(question.explanation).toContain('Read ツール')
        expect(question.referenceUrl).toBe('https://docs.anthropic.com/')
        expect(question.category).toBe('tools')
        expect(question.difficulty).toBe('beginner')
      })

      it('wrongFeedbackが正しく保存される', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        const result = await repository.importFromJson(jsonString)
        const question = result!.questions[0]

        expect(question.options[0].wrongFeedback).toBe('catはシェルコマンドです')
      })

      it('tagsが正しく保存される', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        const result = await repository.importFromJson(jsonString)
        const question = result!.questions[0]

        expect(question.tags).toEqual(['tools', 'basics', 'file-operations'])
      })

      it('異なる難易度の問題が正しく保存される', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.full)

        const result = await repository.importFromJson(jsonString)

        expect(result!.questions[0].difficulty).toBe('beginner')
        expect(result!.questions[1].difficulty).toBe('intermediate')
        expect(result!.questions[2].difficulty).toBe('advanced')
      })
    })

    describe('永続化と復元', () => {
      it('インポート後に新しいリポジトリインスタンスで復元できる', async () => {
        const jsonString = JSON.stringify(VALID_FIXTURES.full)
        await repository.importFromJson(jsonString)

        // 新しいインスタンスを作成（localStorageから読み込む）
        const newRepository = new ElectronStoreQuizRepository()
        const userSets = await newRepository.getUserSets()

        expect(userSets.length).toBe(1)
        expect(userSets[0].title).toBe('テストクイズセット')
        expect(userSets[0].getQuestionCount()).toBe(3)
      })
    })
  })

  describe('deleteUserSet()', () => {
    it('インポートしたセットを削除できる', async () => {
      const jsonString = JSON.stringify(VALID_FIXTURES.minimal)
      const imported = await repository.importFromJson(jsonString)

      await repository.deleteUserSet(imported!.id)
      const userSets = await repository.getUserSets()

      expect(userSets.length).toBe(0)
    })

    it('デフォルトセットは削除できない', async () => {
      await expect(
        repository.deleteUserSet('default')
      ).rejects.toThrow()
    })
  })

  describe('setActiveSet()', () => {
    it('インポートしたセットをアクティブにできる', async () => {
      const jsonString = JSON.stringify(VALID_FIXTURES.full)
      const imported = await repository.importFromJson(jsonString)

      await repository.setActiveSet(imported!.id)
      const activeSet = await repository.getActiveSet()

      expect(activeSet.id).toBe(imported!.id)
      expect(activeSet.title).toBe('テストクイズセット')
    })

    it('アクティブセットがlocalStorageに保存される', async () => {
      const jsonString = JSON.stringify(VALID_FIXTURES.minimal)
      const imported = await repository.importFromJson(jsonString)

      await repository.setActiveSet(imported!.id)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'claude-code-quiz-active-set',
        imported!.id
      )
    })
  })
})
