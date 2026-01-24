/**
 * Domain Layer - クイズアプリのコアビジネスロジック
 *
 * 【このレイヤーの役割】
 * DDD（ドメイン駆動設計）に基づき、ビジネスロジックを集約する。
 * UI や永続化の詳細に依存せず、純粋なビジネスルールを表現する。
 *
 * 【なぜ DDD を採用したのか】
 * 1. テスト容易性：UI や DB なしでロジックをテスト可能
 * 2. 保守性：ビジネスルールの変更が局所化される
 * 3. 再利用性：Web 版、CLI 版など別の UI でも再利用可能
 *
 * 【構成要素】
 *
 * 1. Entities（エンティティ）
 *    - 識別子（ID）を持つオブジェクト
 *    - 例：Question（問題）、QuizSet（問題集）、UserProgress（進捗）
 *    - ライフサイクルを通じて追跡される
 *
 * 2. Value Objects（値オブジェクト）
 *    - 識別子を持たず、値そのものが重要
 *    - 例：Category（カテゴリ）、Difficulty（難易度）、QuizMode（モード）
 *    - 不変（immutable）であること
 *
 * 3. Repository Interfaces（リポジトリインターフェース）
 *    - エンティティの永続化を抽象化
 *    - インターフェースのみ定義、実装は Infrastructure Layer
 *    - これにより Domain Layer は永続化の詳細を知らなくて済む
 *
 * 4. Domain Services（ドメインサービス）
 *    - 複数のエンティティにまたがるロジック
 *    - 例：QuizSessionService（クイズセッションの管理）
 *
 * 【依存関係のルール】
 *
 * Domain Layer は他のどのレイヤーにも依存しない。
 * 他のレイヤーが Domain Layer に依存する。
 *
 *     Presentation (React)
 *            │
 *            ▼
 *     Application (Store)
 *            │
 *     ┌──────┴──────┐
 *     ▼             ▼
 *   Domain    Infrastructure
 *     ▲             │
 *     └─────────────┘
 *       (implements)
 *
 * Infrastructure Layer は Domain Layer のインターフェースを実装する。
 */

// Entities（エンティティ）
// Question, QuizSet, UserProgress
export * from './entities'

// Value Objects（値オブジェクト）
// Category, Difficulty, QuizMode
export * from './valueObjects'

// Repository Interfaces（リポジトリインターフェース）
// IQuizRepository, IProgressRepository
export * from './repositories'

// Domain Services（ドメインサービス）
// QuizSessionService
export * from './services'
