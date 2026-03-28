/**
 * 実践シナリオデータ
 *
 * 実務に即したストーリー形式で既存の問題を出題する。
 * questionId は quizzes.json の ID を参照する。
 */

export interface ScenarioStep {
  readonly type: 'narrative' | 'question'
  readonly text?: string
  readonly questionId?: string
}

export interface ScenarioData {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced'
  readonly steps: readonly ScenarioStep[]
  readonly completionMessage: string
}

export const SCENARIOS: readonly ScenarioData[] = [
  {
    id: 'scenario-onboard',
    title: '月曜朝イチ、新プロジェクト始動',
    description: 'チームリーダーとして、ゼロからClaude Codeをセットアップ',
    icon: '🚀',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '月曜の朝。Slackに「新規ECサイトのプロジェクト、今日からよろしく！」とPMからメッセージが届いた。リポジトリは空っぽ。まずはClaude Codeがこのプロジェクトを理解できるように、設定ファイルを用意しよう。',
      },
      { type: 'question', questionId: 'mem-001' },
      {
        type: 'narrative',
        text: 'CLAUDE.mdを用意したいが、ゼロから書くのは大変だ。プロジェクト構成を自動検出して雛形を作る方法はないだろうか？',
      },
      { type: 'question', questionId: 'mem-003' },
      {
        type: 'narrative',
        text: 'CLAUDE.mdの準備ができた。Claude Codeを起動して、認証機能のコードを書いてもらおう。ファイルの読み書きやBashコマンドの実行…どんなツールが裏で動いているんだろう？',
      },
      { type: 'question', questionId: 'tool-029' },
      { type: 'question', questionId: 'tool-001' },
      {
        type: 'narrative',
        text: '認証機能のPRが完成した。後輩の田中さんが「Claude Code初めてなんですけど、何から始めればいいですか？」と聞いてきた。ベストプラクティスを教えてあげよう。',
      },
      { type: 'question', questionId: 'bp-001' },
      {
        type: 'narrative',
        text: '18時。認証機能のPRがマージされ、田中さんも自分のClaude Codeを起動して最初のコードを書き始めた。プロジェクト初日、いいスタートだ。',
      },
    ],
    completionMessage:
      'プロジェクトの初日が終了！CLAUDE.mdのセットアップから最初のPR作成まで、チームでClaude Codeを使い始める流れを体験しました。',
  },
  {
    id: 'scenario-debug',
    title: '金曜17時、本番が落ちた',
    description: '障害アラートが鳴った。Claude Codeで原因特定から修正まで',
    icon: '🚨',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '金曜17:03。PagerDutyが鳴る。「決済APIがタイムアウト、エラー率が30%超過」——帰りかけていた手を止め、ターミナルを開く。Claude Codeで原因を追おう。まずは新しいセッションを始める。',
      },
      { type: 'question', questionId: 'ses-006' },
      {
        type: 'narrative',
        text: '「決済処理の周辺でタイムアウトしてるっぽい。エラーログを見てくれ」とClaudeに指示した。Claudeがログファイルを読み、コードをgrepし、該当箇所を特定していく。大量のログ出力をどう扱うか？',
      },
      { type: 'question', questionId: 'tool-027' },
      { type: 'question', questionId: 'bp-021' },
      {
        type: 'narrative',
        text: '原因がわかった。外部決済APIのレスポンス形式が変わり、リトライロジックが無限ループに陥っていた。修正パッチを書いてもらおう。素早く操作するためのショートカットも覚えておきたい。',
      },
      { type: 'question', questionId: 'key-001' },
      { type: 'question', questionId: 'bp-002' },
      {
        type: 'narrative',
        text: '17:47。修正パッチがデプロイされ、ダッシュボードのエラー率が0%に戻った。「お疲れさまです、週末楽しんでください」——Slackにそう打って、今度こそ帰路についた。',
      },
    ],
    completionMessage:
      '17:47、修正パッチがデプロイされ、エラー率が0%に戻った。Claude Codeがなければ1時間以上かかっていたかもしれない。',
  },
  {
    id: 'scenario-extend',
    title: 'CTO直々の指令「全社展開してくれ」',
    description: 'MCP・スキル・フックで組織標準のClaude Code環境を構築する',
    icon: '🏗️',
    difficulty: 'advanced',
    steps: [
      {
        type: 'narrative',
        text: 'CTOから「Claude Codeが好評だから全社50人に展開してほしい。ただし、社内DBに直接クエリ投げられるようにして、あとデプロイ前に必ずテスト通るようにして」と言われた。まずは拡張機能で何ができるか把握しよう。',
      },
      { type: 'question', questionId: 'ext-001' },
      {
        type: 'narrative',
        text: '社内DBへのアクセスにはMCPサーバーが使えそうだ。PostgreSQLのMCPサーバーを設定して、Claudeから直接クエリを叩けるようにしよう。',
      },
      { type: 'question', questionId: 'ext-009' },
      { type: 'question', questionId: 'ext-013' },
      {
        type: 'narrative',
        text: 'DBアクセスは完成。次は「PRレビューを自動化するスキル」を作って、全チームに配布する。/review-prと打つだけでClaudeがPRをレビューしてくれる仕組みだ。',
      },
      { type: 'question', questionId: 'skill-002' },
      { type: 'question', questionId: 'ext-084' },
      {
        type: 'narrative',
        text: 'CTOに報告。「DB連携、PRレビュー自動化、デプロイ前チェック、全部できました」——「素晴らしい。来週から段階的にチーム展開を始めよう」。',
      },
    ],
    completionMessage:
      '全社展開の準備が整った。MCPでDB連携、スキルでPRレビュー自動化、フックでデプロイ前チェック。CTOも満足そうだ。',
  },
  {
    id: 'scenario-team',
    title: '新メンバー3人、来週から合流',
    description: 'オンボーディング資料とチームルールを整備する',
    icon: '👥',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '来週月曜、中途入社のエンジニアが3人合流する。全員Claude Code未経験。「初日から戦力になれる環境」を用意したい。まずは、個人設定とプロジェクト設定が混在しないよう、CLAUDE.mdの管理方針を決めよう。',
      },
      { type: 'question', questionId: 'mem-004' },
      { type: 'question', questionId: 'mem-005' },
      {
        type: 'narrative',
        text: '管理方針が決まった。次に「新メンバーが/onboardと打てばプロジェクト構成を全部教えてくれるスキル」を用意しよう。スキルを呼び出す方法を確認しておこう。',
      },
      { type: 'question', questionId: 'skill-004' },
      {
        type: 'narrative',
        text: 'スキルも配置した。最後に、チーム全員が従うべきCLAUDE.mdの書き方ルールを決めておこう。「クリーンに書け」じゃダメで、Claudeが従える具体的な指示が必要だ。',
      },
      { type: 'question', questionId: 'bp-003' },
      { type: 'question', questionId: 'bp-006' },
      {
        type: 'narrative',
        text: '金曜夕方。オンボーディング用のドキュメントをSlackに投稿した。「月曜、/onboard って打ってみてください。あとは Claude が教えてくれます」——新メンバーが迷わず始められる環境が整った。',
      },
    ],
    completionMessage:
      'オンボーディング環境の準備完了。メモリの使い分け、共有スキル、具体的なルール——新メンバーが月曜から迷わず使い始められる。',
  },
  {
    id: 'scenario-keyboard',
    title: '隣の先輩、手がめちゃくちゃ速い',
    description: 'ショートカットを覚えて、あの速さに追いつく',
    icon: '⌨️',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '隣の席の佐藤さん、Claude Codeの操作が異常に速い。マウスに一切触らず、会話の中断も再開もキーボードだけでサクサクやっている。「ちょっと教えてもらえますか？」——まずは基本操作から。',
      },
      { type: 'question', questionId: 'key-003' },
      { type: 'question', questionId: 'key-005' },
      {
        type: 'narrative',
        text: '「それ覚えたら次これ」と佐藤さん。テストが走ってる間に別の質問をしたり、パーミッションモードを切り替えたり、もっと高度なテクニックがあるらしい。',
      },
      { type: 'question', questionId: 'key-006' },
      { type: 'question', questionId: 'key-008' },
      {
        type: 'narrative',
        text: '「最後にこれ。長いプロンプトを書くとき、改行の入れ方を知らないと地味に困るよ」と佐藤さん。',
      },
      { type: 'question', questionId: 'key-007' },
      {
        type: 'narrative',
        text: '「ありがとうございます、佐藤さん」——翌日、自分もマウスに触らずClaude Codeを操作している自分に気づいた。隣で佐藤さんがニヤリとしている。',
      },
    ],
    completionMessage: '佐藤さんに教わったショートカットを一通り覚えた。明日から自分も「手が速い人」の仲間入りだ。',
  },
  {
    id: 'scenario-session',
    title: '3日がかりの大型リファクタ',
    description: 'コンテキストが溢れそうな長丁場を乗り切る',
    icon: '🏔️',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: 'レガシーな決済モジュールのリファクタリング。影響範囲が42ファイル、テストが200件。1日では終わらない。初日、Claude Codeとの会話が長くなりすぎて「なんか最初の方の話を忘れてない？」と感じ始めた。',
      },
      { type: 'question', questionId: 'ses-003' },
      {
        type: 'narrative',
        text: '一度リセットして仕切り直した。2日目、今度は途中でコンテキストが逼迫する前に手を打ちたい。会話を圧縮する方法があるらしい。',
      },
      { type: 'question', questionId: 'cmd-003' },
      { type: 'question', questionId: 'ses-007' },
      {
        type: 'narrative',
        text: '2日目終了。今日の作業内容を明日引き継ぎたい。「続きから」で再開できるようにセッションを保存しておこう。',
      },
      { type: 'question', questionId: 'ses-005' },
      { type: 'question', questionId: 'ses-008' },
      {
        type: 'narrative',
        text: '3日目の夕方。全42ファイルの修正が完了し、200件のテストが全てグリーンに変わった。「あの長丁場を乗り切れたのはセッション管理のおかげだな」と実感する。',
      },
    ],
    completionMessage:
      '3日がかりのリファクタが完了。コンテキスト管理のテクニックがなければ、途中で何度も同じ説明を繰り返すハメになっていた。',
  },
  {
    id: 'scenario-tools',
    title: 'Claudeの「手足」を理解する',
    description: '500行の設定ファイル変更からWeb調査まで、ツールの使い分け',
    icon: '🔧',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '「あれ、Claudeってファイルの1行だけ変えるのと全部書き直すの、どっちもできるの？」——同僚の質問に答えられなかった。Claude Codeのツールを正しく理解しよう。まずはBashツールの使い方から。',
      },
      { type: 'question', questionId: 'tool-004' },
      { type: 'question', questionId: 'tool-003' },
      {
        type: 'narrative',
        text: '500行の設定ファイルの1行を変えるならEdit、新規ファイルを作るならWrite。使い分けがわかった。次に「Claudeってネットも調べられるの？」と聞かれた。',
      },
      { type: 'question', questionId: 'tool-007' },
      { type: 'question', questionId: 'tool-006' },
      {
        type: 'narrative',
        text: 'ReadもWebFetchもある。さらにMCPで外部ツールを追加すれば、SlackやJIRAとも連携できるらしい。',
      },
      { type: 'question', questionId: 'tool-010' },
      {
        type: 'narrative',
        text: '翌日、同僚から「Claude って JIRA のチケットも読めるの？」と聞かれた。「MCP で連携すればね」と即答できた。もう慌てない。',
      },
    ],
    completionMessage:
      'Claudeの「手足」であるツール群を一通り理解した。同僚の質問にも自信を持って答えられるようになった。',
  },
  {
    id: 'scenario-security',
    title: '情シスから「それ安全なの？」と聞かれた',
    description: 'セキュリティ審査をパスするための設定と運用を準備する',
    icon: '🔒',
    difficulty: 'advanced',
    steps: [
      {
        type: 'narrative',
        text: '情報システム部から連絡が来た。「Claude Codeを全社導入するなら、セキュリティ審査を通してください。機密ファイルの誤送信防止と、実行コマンドの制限は必須です」——フックで対応できそうだ。',
      },
      { type: 'question', questionId: 'ext-007' },
      {
        type: 'narrative',
        text: '機密情報のブロックはPreToolUseフックで対応した。次に情シスから「パーミッション設定はどうなってますか？開発者が自由にスキップできる状態じゃ困ります」と追加の指摘。',
      },
      { type: 'question', questionId: 'bp-012' },
      { type: 'question', questionId: 'ext-010' },
      {
        type: 'narrative',
        text: 'パーミッション設計も完了した。最後の質問。「開発者が複数のClaudeを同時に動かした場合、コンフリクトしませんか？並列作業の安全性は？」',
      },
      { type: 'question', questionId: 'bp-011' },
      { type: 'question', questionId: 'bp-041' },
      {
        type: 'narrative',
        text: '情シス部長に審査資料を提出した。フックによる制御、パーミッション設計、並列作業の安全策——「問題ありません、導入を承認します」。全社展開にまた一歩近づいた。',
      },
    ],
    completionMessage:
      'セキュリティ審査の資料が完成。フックによる制御、パーミッション設計、並列作業の安全策——情シスも納得の回答ができた。',
  },
]
