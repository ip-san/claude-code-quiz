# インポート機能 手動テストチェックリスト

このドキュメントは、クイズデータのインポート機能を手動でテストするためのチェックリストです。

## テスト準備

### テストファイルの場所
テスト用のJSONファイルは `src/__fixtures__/import/` にあります：

| ファイル | 説明 |
|---------|------|
| `valid-minimal.json` | 最小構成の有効なJSON |
| `valid-full.json` | 全フィールドを含む有効なJSON |
| `valid-array-format.json` | 配列形式の有効なJSON |
| `invalid-syntax.json` | JSONシンタックスエラー |
| `invalid-missing-required.json` | 必須フィールド欠落 |
| `invalid-wrong-types.json` | 型エラー |
| `invalid-correctindex-outofbounds.json` | correctIndex範囲外 |
| `invalid-too-few-options.json` | 選択肢が少なすぎる |
| `invalid-too-many-options.json` | 選択肢が多すぎる |
| `invalid-empty-quizzes.json` | 空のクイズ配列 |
| `invalid-difficulty.json` | 不正な難易度 |
| `invalid-url.json` | 不正なURL |

### アプリの起動
```bash
bun run dev
```

---

## チェックリスト

### 1. 正常系テスト

#### 1.1 最小構成JSONのインポート
- [ ] 「JSONをインポート」ボタンをクリック
- [ ] `valid-minimal.json` を選択
- [ ] インポート成功メッセージ（エラーなし）
- [ ] クイズ一覧に1問表示される
- [ ] 問題IDが `test-001` である
- [ ] クイズを開始して問題が表示される

#### 1.2 フル構成JSONのインポート
- [ ] `valid-full.json` をインポート
- [ ] タイトル「テストクイズセット」が表示される
- [ ] 3問インポートされる
- [ ] 各問題の難易度（beginner, intermediate, advanced）が正しい
- [ ] 参照URLが問題に含まれている
- [ ] wrongFeedback が不正解時に表示される

#### 1.3 配列形式JSONのインポート
- [ ] `valid-array-format.json` をインポート
- [ ] エラーなくインポートできる
- [ ] 問題が正しく表示される

#### 1.4 セット切り替え
- [ ] インポート後、「デフォルト」に戻せる
- [ ] デフォルトから再度インポートしたセットに切り替えられる
- [ ] 切り替え時に問題数が正しく変わる

---

### 2. 異常系テスト

#### 2.1 JSONシンタックスエラー
- [ ] `invalid-syntax.json` をインポート
- [ ] エラーメッセージが表示される
- [ ] 「Invalid JSON format」を含むメッセージ
- [ ] 既存のデータは変更されない

#### 2.2 必須フィールド欠落
- [ ] `invalid-missing-required.json` をインポート
- [ ] エラーメッセージに `explanation`, `category`, `difficulty` が含まれる
- [ ] どのフィールドが欠けているか分かる

#### 2.3 correctIndex範囲外
- [ ] `invalid-correctindex-outofbounds.json` をインポート
- [ ] 「correctIndex must be within options array bounds」エラー
- [ ] インポート失敗

#### 2.4 選択肢数エラー
- [ ] `invalid-too-few-options.json` をインポート
- [ ] 「At least 2 options are required」エラー
- [ ] `invalid-too-many-options.json` をインポート
- [ ] 「Maximum 6 options allowed」エラー

#### 2.5 空のクイズ配列
- [ ] `invalid-empty-quizzes.json` をインポート
- [ ] 「At least one quiz is required」エラー

#### 2.6 不正な難易度
- [ ] `invalid-difficulty.json` をインポート
- [ ] 難易度に関するエラーメッセージ

#### 2.7 不正なURL
- [ ] `invalid-url.json` をインポート
- [ ] 「Must be a valid URL」エラー

---

### 3. UI/UXテスト

#### 3.1 エラー表示
- [ ] エラーメッセージは赤いボックスで表示される
- [ ] エラーメッセージは×ボタンで閉じられる
- [ ] エラー後に有効なJSONをインポートするとエラーが消える

#### 3.2 ファイル選択ダイアログ
- [ ] JSONファイルのみ選択可能
- [ ] キャンセルしてもエラーにならない
- [ ] 複数回キャンセルしても問題ない

#### 3.3 インポート後の状態
- [ ] インポート後、メニュー画面に戻る
- [ ] アクティブなセットが変更される
- [ ] セット一覧に新しいセットが表示される

---

### 4. データ永続化テスト

#### 4.1 ブラウザリロード後
- [ ] インポートしたセットがリロード後も残っている
- [ ] アクティブなセットが維持されている
- [ ] 問題データが正しく復元される

#### 4.2 アプリ再起動後
- [ ] アプリを完全に終了して再起動
- [ ] インポートしたセットが残っている
- [ ] すべてのデータが正しく復元される

---

### 5. エッジケーステスト

#### 5.1 大量データ
- [ ] 100問以上のJSONをインポート
- [ ] パフォーマンスに問題がない
- [ ] すべての問題が正しくインポートされる

#### 5.2 特殊文字
- [ ] 日本語を含むJSONをインポート
- [ ] 絵文字を含むJSONをインポート
- [ ] HTMLタグを含む問題文

#### 5.3 連続インポート
- [ ] 複数のJSONを連続でインポート
- [ ] それぞれ別のセットとして保存される
- [ ] ID の衝突がない

---

## テスト完了確認

- [ ] すべての正常系テストがパス
- [ ] すべての異常系テストがパス
- [ ] UI/UXテストがパス
- [ ] データ永続化テストがパス
- [ ] エッジケーステストがパス

## 問題発見時

問題を発見した場合は、以下の情報を記録してください：

1. **再現手順**: 問題を再現するための具体的なステップ
2. **期待される動作**: 本来どうなるべきか
3. **実際の動作**: 何が起きたか
4. **エラーメッセージ**: コンソールのエラーがあれば
5. **環境**: OS、ブラウザ、Node.jsバージョンなど
