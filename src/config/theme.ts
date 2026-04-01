/**
 * テーマ設定 — アプリのブランド・カテゴリ・テキストを一元管理
 *
 * このファイルを差し替えるだけで、別の技術テーマのクイズアプリとして動作する。
 * quizzes.json のカテゴリIDと categories のキーが一致していれば OK。
 */

export interface ThemeCategory {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly color: string
  readonly weight: number
  /** カテゴリ正解時に表示する「身につけたスキル」の説明 */
  readonly skillDescription: string
}

export interface ThemeMasteryLevel {
  readonly name: string
  readonly icon: string
  readonly color: string
  readonly bg: string
  readonly req: string | null
}

export interface ThemeScoreMessage {
  readonly title: string
  readonly message: string
  readonly color: string
  readonly bgColor: string
  readonly borderColor: string
}

export interface ThemeScoreThreshold {
  readonly min: number
  readonly result: ThemeScoreMessage
}

export interface ThemeChapterDetail {
  readonly learningPoints: readonly string[]
  readonly encouragement: string
  readonly realWorldExample: string
}

export interface ThemeTutorialSlide {
  readonly title: string
  readonly description: string
  readonly tip?: string
}

export interface ThemeTutorialTerminal {
  readonly youLabel: string
  readonly aiLabel: string
  readonly prompt: string
  readonly reply: string
  readonly replyCont: string
}

export interface ThemeTutorialPathStep {
  readonly label: string
  readonly desc: string
}

export interface ThemeConfig {
  /** アプリ名（フル） */
  readonly appName: string
  /** アプリ名（短縮、PWA用） */
  readonly appShortName: string
  /** ロゴテキスト（ウェルカム画面のアイコン内） */
  readonly logoText: string
  /** テーマ主題（AIプロンプトの接頭辞） */
  readonly subject: string
  /** キャッチフレーズ */
  readonly tagline: string
  /** サブキャッチ */
  readonly subtitle: string
  /** 証明書タイトル */
  readonly certificateTitle: string
  /** 証明書フッター */
  readonly certificateFooter: string
  /** 全体像モード証明書説明 */
  readonly certificateDescOverview: string
  /** 実力テスト証明書説明 */
  readonly certificateDescFull: string
  /** 公式ドキュメントURL（結果画面の「始める」リンク） */
  readonly officialDocsUrl: string
  /** 公式ドキュメントのリンクテキスト */
  readonly officialDocsLabel: string
  /** PWA URL（シェアメッセージ用） */
  readonly pwaUrl: string
  /** シェアメッセージのハッシュタグ */
  readonly shareHashtags: string
  /** カテゴリ定義 */
  readonly categories: readonly ThemeCategory[]
  /** マスタリーレベル定義 */
  readonly masteryLevels: readonly ThemeMasteryLevel[]
  /** ウェルカム画面の特徴リスト */
  readonly welcomeFeatures: readonly {
    readonly iconColor: string
    readonly title: string
    readonly desc: string
  }[]
  /** チーム共有メッセージテンプレート（${percentage} でスコアを差し込み） */
  readonly teamShareTemplate: string
  /** チーム共有アクションステップ */
  readonly teamShareSteps: readonly string[]
  /** localStorage キーのプレフィックス */
  readonly storagePrefix: string
  /** 全体像モードのチャプター定義 */
  readonly overviewChapters: readonly {
    readonly id: number
    readonly name: string
    readonly subtitle: string
    readonly icon: string
    readonly actionItem: string
    /** 「読んでから解く」モードで表示する導入読み物 */
    readonly introContent?: readonly string[]
  }[]
  /** スコアに基づく結果メッセージ（閾値降順） */
  readonly scoreMessages: readonly ThemeScoreThreshold[]
  /** チャプター導入画面の詳細（learningPoints, encouragement, realWorldExample） */
  readonly chapterDetails: Readonly<Record<number, ThemeChapterDetail>>
  /** 実践シナリオモードの説明文 */
  readonly scenarioModeDescription: string
  /** チュートリアルスライド（4枚） */
  readonly tutorialSlides: readonly ThemeTutorialSlide[]
  /** チュートリアルのターミナルデモテキスト */
  readonly tutorialTerminal: ThemeTutorialTerminal
  /** チュートリアルの吹き出し例 */
  readonly tutorialBubbles: readonly string[]
  /** チュートリアルの能力ラベル */
  readonly tutorialCapabilities: readonly { readonly label: string }[]
  /** チュートリアルの学習パスステップ */
  readonly tutorialPathSteps: readonly ThemeTutorialPathStep[]
  /** 「〜とは」ラベル（メニューヘッダー用） */
  readonly aboutLabel: string
  /** 「〜とは」説明文 */
  readonly aboutDesc: string
  /** 「読んでから解く」学習の進め方の本文 */
  readonly studyFirstHowToLearnBody: string
  /** 検索プレースホルダー（トピック固有のキーワード例） */
  readonly searchPlaceholder: string
  /** 最高レベル到達時のメッセージ */
  readonly masteryMaxMessage: string
}

// ============================================================
// Claude Code テーマ（デフォルト）
// ============================================================

const claudeCodeTheme: ThemeConfig = {
  appName: 'Claude Code Quiz',
  appShortName: 'CC Quiz',
  logoText: 'CC',
  subject: 'Claude Code',
  tagline: 'AI 時代のスキルを、今日から身につける',
  subtitle: '経験不問 | ${count}問 | スマホでいつでも',
  certificateTitle: 'Claude Code Quiz Master Certification',
  certificateFooter: 'Powered by Claude Code Quiz',
  certificateDescOverview: 'Claude Code の全体像を習得したことを証明します',
  certificateDescFull: 'Claude Code の機能と使い方に関する実力テストに合格しました',
  officialDocsUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  officialDocsLabel: 'Claude Code を始める',
  pwaUrl: 'https://ip-san.github.io/claude-code-quiz/',
  shareHashtags: '#ClaudeCode #AI駆動開発 #DX推進',
  categories: [
    {
      id: 'memory',
      name: 'Memory (CLAUDE.md)',
      icon: '📝',
      color: 'blue',
      weight: 15,
      description: 'CLAUDE.md、@インポート、.claude/rules/による永続的なコンテキスト管理',
      skillDescription: 'プロジェクト文脈を記憶させられる',
    },
    {
      id: 'skills',
      name: 'Skills',
      icon: '✨',
      color: 'purple',
      weight: 15,
      description: 'スキル作成、frontmatter設定、動的コンテキスト注入',
      skillDescription: 'AI ワークフローを作れる',
    },
    {
      id: 'tools',
      name: 'Tools',
      icon: '🔧',
      color: 'orange',
      weight: 15,
      description: 'Read/Write/Edit/Bash/Glob/Grep等の組み込みツール',
      skillDescription: 'ファイル操作・検索を自動化できる',
    },
    {
      id: 'commands',
      name: 'Commands',
      icon: '💻',
      color: 'emerald',
      weight: 15,
      description: '/context、/compact、/init、!prefix等のコマンド操作',
      skillDescription: '対話を効率的にコントロールできる',
    },
    {
      id: 'extensions',
      name: 'Extensions',
      icon: '🧩',
      color: 'pink',
      weight: 15,
      description: 'MCP、Hooks、Subagents、Pluginsによる拡張機能',
      skillDescription: 'MCP・プラグインで拡張できる',
    },
    {
      id: 'session',
      name: 'Session & Context',
      icon: '📚',
      color: 'cyan',
      weight: 10,
      description: 'セッション管理、コンテキストウィンドウ、fork操作',
      skillDescription: 'セッション管理を安全に行える',
    },
    {
      id: 'keyboard',
      name: 'Keyboard & UI',
      icon: '⌨️',
      color: 'yellow',
      weight: 10,
      description: 'ショートカット、Vimモード、UI操作',
      skillDescription: 'ショートカットで素早く操作',
    },
    {
      id: 'bestpractices',
      name: 'Best Practices',
      icon: '💡',
      color: 'green',
      weight: 10,
      description: '効果的な使い方、プロンプト設計、ワークフロー',
      skillDescription: '実務で成果を出せる',
    },
  ],
  masteryLevels: [
    { name: 'AI入門者', icon: '🌱', color: 'text-claude-orange', bg: 'bg-claude-orange/10', req: null },
    { name: 'AI学習者', icon: '📚', color: 'text-blue-600', bg: 'bg-blue-500/10', req: '正答率50%以上' },
    { name: 'AI実践者', icon: '🚀', color: 'text-green-600', bg: 'bg-green-500/10', req: '正答率70%以上' },
    { name: 'AI推進者', icon: '⚡', color: 'text-purple-600', bg: 'bg-purple-500/10', req: '正答率80% + 半数以上学習' },
    {
      name: 'AI牽引役',
      icon: '👑',
      color: 'text-yellow-600',
      bg: 'bg-yellow-500/10',
      req: '正答率85% + 全カテゴリ習得',
    },
  ],
  welcomeFeatures: [
    {
      iconColor: 'text-claude-orange',
      title: '知識ゼロから始められる',
      desc: 'AI を使ったことがなくても大丈夫。基礎から順番にガイドします',
    },
    {
      iconColor: 'text-blue-500',
      title: '1問ずつ、確実に身につく',
      desc: '解説付きのクイズで「わかった」を積み重ねていきましょう',
    },
    {
      iconColor: 'text-green-500',
      title: 'あなたのペースで成長',
      desc: 'スマホでいつでも学習。毎日少しずつで、着実にスキルアップ',
    },
  ],
  teamShareTemplate: `Claude Code Quiz で AI コーディングアシスタントの基本を学びました（正答率 \${percentage}%）。

チームで AI 駆動開発を始めるために、まずこの3つから取り組みませんか？

1. 各自が Claude Code Quiz を完了する（スマホで10分）
2. プロジェクトに CLAUDE.md を作成して開発ルールを共有する
3. 週1回「AI で何を自動化できたか」を共有する場を設ける

クイズはこちら → https://ip-san.github.io/claude-code-quiz/

#ClaudeCode #AI駆動開発 #DX推進`,
  teamShareSteps: [
    'チームメンバーにこのクイズを共有する',
    'プロジェクトに CLAUDE.md を作成してルールを統一する',
    '週1回「AIで何を自動化できたか」共有会を設ける',
  ],
  storagePrefix: 'claude-code-quiz',
  overviewChapters: [
    {
      id: 1,
      name: 'はじめの一歩',
      subtitle: '起動して、プロジェクトの全体像を把握する',
      icon: '👋',
      actionItem:
        '【作れるもの】プロジェクトの構造レポート。「このプロジェクトの構成を説明して」と聞いて、AIが生成した要約をチームに共有してみる',
      introContent: [
        '新しいプロジェクトに配属された初日を想像してください。コードベースは10万行。ドキュメントは古い。先輩に聞きたいけど忙しそう——。',
        'Claude Code がいれば、ターミナルで「このプロジェクト、どういう構成になってる？」と聞くだけで、フォルダ構成、使われているフレームワーク、テストの実行方法まで教えてくれます。先輩の手を止めなくても、5分で全体像がつかめます。',
        'ポイントは「完璧な質問」をしなくていいこと。「ログインの処理ってどこにある？」「このエラー、何が原因？」——日本語で、思ったままに聞けばいい。AI があなたの意図を汲み取って、最適な答えを探してくれます。',
        '公式ドキュメントには載っていない現場の知恵: 最初の質問は「このプロジェクトの README を要約して」がおすすめ。AI の要約を読むだけで、自分で README を読むより3倍速く全体像が掴めます。',
      ],
    },
    {
      id: 2,
      name: 'AI に記憶させる',
      subtitle: 'CLAUDE.md を作って、AI をプロジェクト専用にカスタマイズ',
      icon: '📝',
      actionItem:
        '【作れるもの】プロジェクト専用 CLAUDE.md。/init で雛形生成 → コーディング規約とテスト方法を3行追記 → AI がルールに従うか確認',
      introContent: [
        'こんな経験はありませんか？ AI にコードを書いてもらったのに、プロジェクトのコーディング規約と全然違う書き方で出てきた。変数名の付け方もテストの書き方もバラバラ——結局、手直しに時間を取られて「自分で書いた方が早かった」と思ってしまう。',
        'これは AI が悪いのではなく、「あなたのプロジェクトのルール」を知らないだけです。CLAUDE.md というファイルに「変数名はキャメルケース」「テストは Jest で書く」「エラーは日本語メッセージ」と書くだけで、AI は次からそのルールに従います。',
        '驚くのは、CLAUDE.md はただのテキストファイルだということ。YAML でも JSON でもない。箇条書きのメモ帳です。「テスト書いて」と言えば、あなたのプロジェクトの Jest 設定に合ったテストが出てくる。この「AI がルールを覚えてくれる」感覚は、一度体験すると手放せなくなります。',
        '現場の知恵: 最初から完璧な CLAUDE.md を書こうとしないでください。AI に「/init」と打てば、プロジェクト構成を自動検出して雛形を作ってくれます。そこから気づいたルールを少しずつ書き足していく——これが一番うまくいくパターンです。',
      ],
    },
    {
      id: 3,
      name: 'AI に作業を任せる',
      subtitle: 'バグ修正やリファクタリングを AI に委任する',
      icon: '🔧',
      actionItem:
        '【作れるもの】AI によるバグ修正 PR。既知のバグを1つ選び、Claude Code に修正させてテストを通し、PR を作成するところまで',
      introContent: [
        'あるチームの話です。レガシーコードの変数名を統一するタスクが降ってきた。42ファイル、300箇所以上。手作業だと丸一日。grep して sed して、テストが壊れてないか確認して——想像するだけで憂鬱ですよね。',
        'Claude Code なら「src/ 以下の全ファイルで、getUserInfo を fetchUserProfile に変更して。import も直して。テストも通るか確認して」と伝えるだけ。AI が全ファイルを走査し、変更箇所を一つずつ提案してくれます。あなたは diff を見て OK か NG を判断するだけ。',
        '大事なのは、AI は「勝手に」ファイルを変えないこと。必ず変更内容を見せて、あなたの承認を待ちます。気に入らなければ却下すればいい。AI がミスっても、あなたが最後の砦です。この安心感があるから、大胆なリファクタリングにも踏み切れます。',
        '現場の知恵: 「100ファイル一気に変えて」より「まず3ファイルだけやってみて」の方がうまくいきます。AI の出力品質を確認してから範囲を広げる。これがプロの使い方です。',
      ],
    },
    {
      id: 4,
      name: '安全に使いこなす',
      subtitle: 'チームで安心して使える設定を作る',
      icon: '🔒',
      actionItem:
        '【作れるもの】チーム用の権限設定ファイル。settings.json に「テストは自動OK」「push は確認」を設定し、チームに共有',
      introContent: [
        '「AI がファイルを消せるなら、本番 DB も消せるの？」——上司にそう聞かれたら、あなたはどう答えますか？',
        'Claude Code はデフォルトで「確認モード」になっています。ファイルの変更、コマンドの実行、すべてユーザーの承認が必要。さらに、settings.json で「npm test は自動OK」「git push は毎回確認」「rm -rf は完全禁止」のように、コマンド単位で権限を設定できます。',
        'チームで使う場合はさらに強力です。管理者が Managed CLAUDE.md でルールを強制すれば、個々の開発者がそのルールを回避することはできません。「このコマンドだけは絶対にブロック」という設定が、組織全体に適用されます。',
        '現場の知恵: 最初は全部確認モードで始めて、信頼できるコマンドだけ徐々に自動承認に変えていくのがベストです。「全部自動にしたい」と思うかもしれませんが、1ヶ月使ってから判断しても遅くありません。',
      ],
    },
    {
      id: 5,
      name: '自分だけの AI を作る',
      subtitle: 'チーム専用のスキルを作って、ノウハウをコマンド化',
      icon: '🧩',
      actionItem:
        '【作れるもの】/onboard スキル。新メンバーが打つだけでプロジェクト構成・開発フロー・よくある質問を AI が説明してくれるコマンド',
      introContent: [
        'あなたのチームに「あの人に聞けば何でも教えてくれる」という先輩がいたとします。でもその先輩、来月退職するんです。先輩の知識をどう引き継ぎますか？',
        'Claude Code のスキル機能は、まさにそのためにあります。「/deploy と打ったらステージング → テスト → 本番の順でデプロイ」「/review と打ったらセキュリティ・パフォーマンス・アクセシビリティの観点でレビュー」——先輩の頭の中にあるノウハウを、コマンド1つで再現可能にする。',
        'スキルの正体は、ただのマークダウンファイルです。手順書を書くのと同じ感覚で、AI への指示を書くだけ。新人が /deploy と打てば、先輩と同じ品質でデプロイできる。属人化を解消する最も実用的な方法かもしれません。',
        '現場の知恵: 最初に作るスキルは、「チームで一番よく聞かれる質問」への回答がおすすめ。「デプロイ方法」「テストの書き方」「PR の出し方」——これを /onboard スキルにまとめれば、新人のオンボーディングが一瞬で終わります。',
      ],
    },
    {
      id: 6,
      name: '現場で活かす',
      subtitle: '実務のタスクを AI と一緒に完了させる',
      icon: '🚀',
      actionItem:
        '【作れるもの】AI と協働した実務成果物。今週のタスクを1つ選び、プランモードで計画 → 段階的に実装 → テスト → PR 作成まで',
      introContent: [
        'ここまで学んだ機能を「知っている」のと「使いこなしている」のには大きな差があります。その差を生むのが、ベストプラクティスです。',
        '最も重要なのは「AI への指示の出し方」です。「ログイン機能を作って」より「Express + JWT で、メールとパスワードで認証するログイン API を作って。バリデーションは Zod で。テストも書いて」の方が、圧倒的に良い出力が得られます。要件を箇条書きにするだけで、AI の理解度が劇的に変わります。',
        'もう一つ。「一気に全部頼まない」こと。100行の機能をいきなり頼むより、「まず型定義を書いて」→「次にAPI層」→「テストを追加して」と段階的に進める方が、修正が少なく済みます。AI との協働は、ペアプログラミングに近い感覚です。',
        '現場の知恵: AI が出力したコードを「そのまま使う」のではなく「レビューする」つもりで見てください。AI は優秀なジュニアエンジニアです。たまにミスをするけれど、指摘すればすぐ直してくれる。あなたはシニアエンジニアとして、AI の出力の品質を担保する——それが最も生産性の高い使い方です。',
      ],
    },
  ],
  scoreMessages: [
    {
      min: 100,
      result: {
        title: 'パーフェクト！',
        message: '全問正解。あなたは Claude Code を完全に理解しています。',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      },
    },
    {
      min: 80,
      result: {
        title: '素晴らしい！',
        message: 'ここまで来たあなたなら、実務でも活躍できます。',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      },
    },
    {
      min: 70,
      result: {
        title: '着実に成長しています',
        message: '基礎は身についています。復習で更に自信をつけましょう。',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      },
    },
    {
      min: 50,
      result: {
        title: 'いい線いってます',
        message: 'あと少しです。間違えた問題を見直すだけで、大きく伸びます。',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      },
    },
    {
      min: 0,
      result: {
        title: '最初の一歩を踏み出しました',
        message: 'ここから始まります。繰り返すほど必ず伸びます。',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      },
    },
  ],
  chapterDetails: {
    1: {
      learningPoints: [
        'Claude Code がどんなツールなのか',
        'ターミナルから AI に話しかける仕組み',
        '最初の一言で何ができるか',
      ],
      encouragement:
        'プログラミング経験やAIの知識は一切不要です。「こんなツールがあるんだ」くらいの気持ちで進めましょう。',
      realWorldExample:
        '例: ターミナルで「このプロジェクトの構成を教えて」と聞くだけで、AIがコード全体を分析してくれます',
    },
    2: {
      learningPoints: [
        'CLAUDE.md ファイルの役割と書き方',
        'AI にプロジェクトのルールを覚えさせる方法',
        '記憶の仕組み（永続メモリ）',
      ],
      encouragement: '「設定ファイル」と聞くと難しそうですが、実はメモ帳に箇条書きするだけです。',
      realWorldExample: '例:「テストは必ず書いて」と CLAUDE.md に書くだけで、AI が毎回テストを書いてくれます',
    },
    3: {
      learningPoints: [
        'ファイルの読み書き・編集を AI に任せる方法',
        'コマンド実行の仕組みと安全性',
        'どこまで自動化できるか',
      ],
      encouragement: 'AI に任せるのが怖い？大丈夫、実行前に必ず確認があります。まずは仕組みを知りましょう。',
      realWorldExample: '例:「この関数名を全部キャメルケースに変えて」→ AI が関連ファイルを一括修正',
    },
    4: {
      learningPoints: [
        '権限設定で AI にできることを制限する方法',
        'サンドボックスの仕組み',
        'チームで安全に使うためのルール',
      ],
      encouragement: 'セキュリティの専門知識は不要です。「どんな安全装置があるか」を知るだけで十分です。',
      realWorldExample: '例: settings.json で「npm test は自動実行OK」「git push は毎回確認」と設定できます',
    },
    5: {
      learningPoints: [
        'MCP サーバーで AI の能力を拡張する方法',
        'Hooks で自動化パイプラインを作る方法',
        'スキル（スラッシュコマンド）の作り方',
      ],
      encouragement: 'ここからは応用編です。全部覚える必要はありません。「こんなことができるんだ」と把握できればOK。',
      realWorldExample: '例: /deploy というスキルを作れば、デプロイ手順を毎回 AI に説明する必要がなくなります',
    },
    6: {
      learningPoints: ['効果的なプロンプトの書き方', 'AI との協働ワークフロー', 'チーム導入のベストプラクティス'],
      encouragement: '最終チャプターです！ここまでの知識を実務でどう活かすかを学びます。',
      realWorldExample: '例:「要件を箇条書きで伝える」だけで、AI の出力品質が劇的に向上します',
    },
  },
  scenarioModeDescription: '実務シナリオに沿ってClaude Codeを学ぶ',
  tutorialSlides: [
    {
      title: 'Claude Code とは',
      description:
        'ターミナルで動く AI アシスタント。日本語で話しかけるだけで、コード生成・ファイル編集・バグ修正など開発作業をサポートしてくれます。',
      tip: 'プログラミング経験がなくても使えます',
    },
    {
      title: 'クイズで学ぼう',
      description:
        '基本操作から応用テクニックまで、クイズ形式で楽しく学べます。間違えても解説付きなので、確実に知識が身につきます。',
    },
  ],
  tutorialTerminal: {
    youLabel: 'あなた:',
    aiLabel: 'Claude:',
    prompt: 'このプロジェクトの構成を教えて',
    reply: 'このプロジェクトは React + TypeScript で',
    replyCont: '構成されています。主なディレクトリは...',
  },
  tutorialBubbles: ['ログイン機能を追加して', 'このバグを直して', 'テストを書いて', 'コードをリファクタリングして'],
  tutorialCapabilities: [
    { label: 'コード生成' },
    { label: 'ファイル編集' },
    { label: 'コマンド実行' },
    { label: '安全性チェック' },
  ],
  tutorialPathSteps: [
    { label: '基本操作を知る', desc: '全体像モード 6チャプター' },
    { label: '知識を確認する', desc: 'カテゴリ別・ランダム問題' },
    { label: '実力を試す', desc: '100問の実力テスト' },
  ],
  aboutLabel: 'Claude Code とは',
  aboutDesc: '基本を4画面で紹介',
  studyFirstHowToLearnBody:
    'チャプターを選んで、基礎的な解説を読みましょう。やさしい内容だけに絞っているので、 Claude Code を知らなくても読み進められます。',
  searchPlaceholder: '例: CLAUDE.md, MCP, hooks',
  masteryMaxMessage: '最高レベル到達。あなたはチームのAI駆動開発を牽引できます。',
}

// ============================================================
// アクティブテーマ
// ============================================================

/** 現在のテーマ設定。別テーマに切り替える場合はここを差し替える */
export const theme: ThemeConfig = claudeCodeTheme

/** テーマからカテゴリ数を取得するヘルパー */
export function getCategoryCount(): number {
  return theme.categories.length
}

/** カテゴリIDからスキル説明を取得 */
export function getSkillDescription(categoryId: string): string {
  return theme.categories.find((c) => c.id === categoryId)?.skillDescription ?? ''
}

/** subtitle の ${count} を実際の問題数で置換 */
export function getSubtitle(questionCount: number): string {
  return theme.subtitle.replace('${count}', String(questionCount))
}
