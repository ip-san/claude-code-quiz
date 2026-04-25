---
paths:
  - "src/infrastructure/persistence/SessionRepository.ts"
  - "src/stores/utils.ts"
  - "src/stores/slices/resumeSlice.ts"
  - "src/stores/slices/sessionSlice.ts"
---

# セッション永続化の注意点

IMPORTANT: `QuizSessionState` に新フィールドを追加したら以下の3箇所を必ず同時更新すること。

1. `src/infrastructure/persistence/SessionRepository.ts` — `SavedSessionData` に保存フィールド追加
2. `src/stores/utils.ts` — `saveSessionSnapshot()` でシリアライズ
3. `src/stores/slices/resumeSlice.ts` — `resumeSession()` で復元

- `answerHistory` は `answerRecords` 配列として localStorage に保存
- `retryQuestion` は UI 状態をリセットし、再回答時に**差分スコアで計算**（二重カウント防止）
- `finishTest` は answerHistory からスコアを再計算（整合性保証）
