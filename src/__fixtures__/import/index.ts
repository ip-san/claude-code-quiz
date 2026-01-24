/**
 * Import Test Fixtures
 *
 * テスト用のJSONフィクスチャを提供する。
 * 各フィクスチャはインポート機能のテストに使用される。
 */

import validMinimal from './valid-minimal.json'
import validFull from './valid-full.json'
import validArrayFormat from './valid-array-format.json'

// Valid fixtures
export const VALID_FIXTURES = {
  /** 最小構成の有効なJSON */
  minimal: validMinimal,
  /** 全フィールドを含む有効なJSON */
  full: validFull,
  /** 配列形式の有効なJSON */
  arrayFormat: validArrayFormat,
} as const

// Invalid fixture file contents (as strings for testing)
export const INVALID_FIXTURES = {
  /** JSONシンタックスエラー */
  syntax: `{
  "quizzes": [
    {
      "id": "broken"
      "question": "JSONシンタックスエラー"
    }
  ]
}`,
  /** 必須フィールド欠落 (explanation, category, difficulty) */
  missingRequired: JSON.stringify({
    quizzes: [{
      id: "missing-001",
      question: "必須フィールドが欠けている問題",
      options: [{ text: "選択肢A" }, { text: "選択肢B" }],
      correctIndex: 0
    }]
  }),
  /** 型エラー (id: number, correctIndex: string) */
  wrongTypes: JSON.stringify({
    quizzes: [{
      id: 123,
      question: "idが数値になっている",
      options: [{ text: "選択肢A" }, { text: "選択肢B" }],
      correctIndex: "zero",
      explanation: "型が間違っている",
      category: "test",
      difficulty: "beginner"
    }]
  }),
  /** correctIndex が範囲外 */
  correctIndexOutOfBounds: JSON.stringify({
    quizzes: [{
      id: "outofbounds-001",
      question: "correctIndexが範囲外",
      options: [{ text: "選択肢A" }, { text: "選択肢B" }],
      correctIndex: 5,
      explanation: "correctIndexが選択肢の数を超えている",
      category: "test",
      difficulty: "beginner"
    }]
  }),
  /** 選択肢が少なすぎる (1つ) */
  tooFewOptions: JSON.stringify({
    quizzes: [{
      id: "fewoptions-001",
      question: "選択肢が1つしかない",
      options: [{ text: "唯一の選択肢" }],
      correctIndex: 0,
      explanation: "選択肢は最低2つ必要",
      category: "test",
      difficulty: "beginner"
    }]
  }),
  /** 選択肢が多すぎる (7つ) */
  tooManyOptions: JSON.stringify({
    quizzes: [{
      id: "manyoptions-001",
      question: "選択肢が7つある",
      options: [
        { text: "選択肢1" }, { text: "選択肢2" }, { text: "選択肢3" },
        { text: "選択肢4" }, { text: "選択肢5" }, { text: "選択肢6" },
        { text: "選択肢7" }
      ],
      correctIndex: 0,
      explanation: "選択肢は最大6つまで",
      category: "test",
      difficulty: "beginner"
    }]
  }),
  /** 空のクイズ配列 */
  emptyQuizzes: JSON.stringify({
    title: "空のクイズセット",
    quizzes: []
  }),
  /** 不正な難易度 */
  invalidDifficulty: JSON.stringify({
    quizzes: [{
      id: "difficulty-001",
      question: "不正な難易度",
      options: [{ text: "選択肢A" }, { text: "選択肢B" }],
      correctIndex: 0,
      explanation: "difficultyが不正な値",
      category: "test",
      difficulty: "expert"
    }]
  }),
  /** 不正なURL */
  invalidUrl: JSON.stringify({
    quizzes: [{
      id: "url-001",
      question: "不正なURL形式",
      options: [{ text: "選択肢A" }, { text: "選択肢B" }],
      correctIndex: 0,
      explanation: "URLが不正",
      referenceUrl: "not-a-valid-url",
      category: "test",
      difficulty: "beginner"
    }]
  }),
} as const
