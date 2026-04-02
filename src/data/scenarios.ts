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
        text: '月曜の朝。Slackに「新規ECサイトのプロジェクト、今日からよろしく！」とPMからメッセージが届いた。リポジトリは空っぽ。チームメンバーは4人。全員 Claude Code は初めて。\n\nここで最初にやるべきことを間違えると、後から「AIが使えない」という評価になってしまう。現場の教訓——Claude Codeの第一印象は「最初の10分」で決まる。正しい一歩目は、AI にプロジェクトのルールを教えることだ。',
      },
      { type: 'question', questionId: 'mem-001' },
      {
        type: 'narrative',
        text: 'CLAUDE.mdを用意したいが、ゼロから書くのは大変だ。実は「コーディング規約」「テストの方針」「ディレクトリ構造」——こういったルールをいちいち手書きしなくても、プロジェクトを解析して雛形を生成する方法がある。',
      },
      { type: 'question', questionId: 'mem-003' },
      {
        type: 'narrative',
        text: 'CLAUDE.mdの準備ができた。いよいよ最初のコード、認証機能を書いてもらう。\n\nここで「認証機能作って」と一言で済ませる人と、まずコードベースを理解させてから段階的に依頼する人で、出力品質に天と地の差が出る。ベテランほどこの「準備」に時間をかける。',
      },
      { type: 'question', questionId: 'bp-029' },
      { type: 'question', questionId: 'bp-002' },
      {
        type: 'narrative',
        text: '認証機能のPRが完成した。後輩の田中さんが「Claude Code初めてなんですけど、何から始めればいいですか？」と聞いてきた。\n\n自分もさっき覚えたばかりだが、「とりあえず試して」と突き放すと田中さんは迷子になる。最初の一歩をちゃんと教えてあげよう。',
      },
      { type: 'question', questionId: 'bp-001' },
      {
        type: 'narrative',
        text: '田中さんもコードを書き始めた。するとPMが来て「で、Claude Codeって月いくらかかるの？4人で使ってコスト大丈夫？」と聞いてくる。\n\n現場の教訓——利用コストの見える化は初日にやっておくべきだ。2週間後に「想定の3倍です」と言われても手遅れ。使用状況を確認するコマンドを知っておこう。',
      },
      { type: 'question', questionId: 'cmd-015' },
      {
        type: 'narrative',
        text: '18時。認証機能のPRがマージされ、田中さんもコードを書き始め、PMにはコスト確認の方法を伝えた。「え、もうPR出せたんですか？」とPMが驚いている。プロジェクト初日、最高のスタートだ。',
      },
    ],
    completionMessage:
      'プロジェクト初日が終了！CLAUDE.mdのセットアップ、最初のPR作成、後輩への引き継ぎ、コスト管理まで——チームでClaude Codeを使い始める一連の流れを体験しました。',
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
        text: '金曜17:03。PagerDutyが鳴る。「決済APIがタイムアウト、エラー率が30%超過」——帰りかけていた手を止め、ターミナルを開く。\n\n障害対応で最も危険なのは「焦って見当違いの修正をデプロイする」こと。まずは冷静に。Claude Codeで原因を特定するが、今のセッションにはさっきまでの雑多な会話が残っている。障害対応は、汚れていないコンテキストで始めるのが鉄則だ。',
      },
      { type: 'question', questionId: 'ses-006' },
      {
        type: 'narrative',
        text: 'きれいなセッションで再出発。「決済処理の周辺でタイムアウトしてるっぽい。エラーログを見て原因を特定してくれ」とClaudeに指示した。\n\nここでの現場の知恵——「エラーログを見て」で止めず「原因を特定して」まで伝えること。さらに、修正後の検証手段（テストコマンド、ヘルスチェックURL）も一緒に渡しておくと、AI が自分で確認しながら進められる。',
      },
      { type: 'question', questionId: 'bp-007' },
      { type: 'question', questionId: 'bp-021' },
      {
        type: 'narrative',
        text: '原因がわかった。外部決済APIのレスポンス形式が変わり、リトライロジックが無限ループに陥っていた。修正パッチを書いてもらうが——Claudeが的外れな方向に修正を始めた。リトライ上限を増やそうとしている。違う、レスポンスのパース部分が原因だ。間違った修正が走り続ける前に、すぐ止めないと。',
      },
      { type: 'question', questionId: 'key-001' },
      { type: 'question', questionId: 'bp-023' },
      {
        type: 'narrative',
        text: '正しい修正方針で再出発。Claudeが5つのファイルを修正してくれたが——テストを走らせると、修正3〜5が余計だった。決済ロジックは直ったが、関連するバリデーションまで変えてしまっている。\n\n全部やり直し？いや、Claude Code にはファイル変更を部分的に巻き戻す方法がある。3ファイル分だけ元に戻して、正しい2ファイルは残す。',
      },
      { type: 'question', questionId: 'ses-099' },
      {
        type: 'narrative',
        text: '修正パッチを適用したが、まだエラーが出る。コードは正しいはずだ。もしかして Claude Code 自体の環境に問題がないか？MCPサーバーが応答していない可能性もある。環境の健康状態を素早く診断する方法を知っておこう。',
      },
      { type: 'question', questionId: 'cmd-009' },
      {
        type: 'narrative',
        text: '17:55。環境は問題なかった。もう一度エラーログを確認すると、キャッシュが原因だった。キャッシュクリア後、修正パッチがようやく効いてダッシュボードのエラー率が0%に戻った。\n\n「お疲れさまです、週末楽しんでください」——Slackにそう打って、今度こそ帰路についた。',
      },
    ],
    completionMessage:
      '52分で障害復旧。クリーンなセッション開始、検証手段の同時提供、暴走の即座の中断、部分的な巻き戻し、環境診断——障害対応に必要なClaude Codeテクニックを全て体験しました。',
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
        text: 'CTOから直接メッセージが来た。「Claude Codeが開発チームで好評だ。全社50人に展開してほしい。ただし、条件がある。社内DBに直接クエリを投げられるようにすること。それと、デプロイ前に必ずテストが通る仕組みを入れること」\n\n個人で使うのと組織に展開するのはまったく別の話だ。まずは、Claude Codeにどんな拡張ポイントがあるのか全体像を把握しよう。',
      },
      { type: 'question', questionId: 'ext-001' },
      {
        type: 'narrative',
        text: '全体像がわかった。まずDB連携から着手。MCPサーバーで社内DBにクエリを投げられるようにした——が、テスト中にヒヤリとする出来事が。開発環境のつもりが、本番DBに接続されていた。\n\nCTOの要件「デプロイ前に必ずテスト通す」には、フックが鍵になる。セッション開始時に Git の最新情報や担当 Issue を自動で読み込ませることもできる。さらに、ファイル編集後に自動で lint を走らせれば「フォーマット崩れ」のレビューコメントが不要になる。',
      },
      { type: 'question', questionId: 'ext-020' },
      { type: 'question', questionId: 'ext-003' },
      {
        type: 'narrative',
        text: 'DB連携とlint自動化が動いた。次は「PRレビューの自動化」。/review-pr と打つだけでClaudeがPRをレビューしてくれる仕組みだ。\n\n最初のスキル案を作ったとき、うっかり削除権限を付けたまま共有してしまった。もし誰かが /cleanup と打って本番データを消したら——背筋が凍った。副作用があるスキルは、設計を間違えると取り返しがつかない。',
      },
      { type: 'question', questionId: 'skill-002' },
      { type: 'question', questionId: 'ext-084' },
      {
        type: 'narrative',
        text: 'CTOへの報告会議。「DB連携、PRレビュー自動化、デプロイ前チェック——全て整いました。ただ、テスト中に本番DB接続とスキル権限の事故未遂がありました。対策済みです」\n\nCTOが頷く。「正直に報告してくれて助かる。パイロットチーム5人で来週からテスト。2週間後にGo/No-Go判断だ」\n\n振り返ると、「便利ツール」を「組織のインフラ」に変える過程で一番学んだのは、失敗から安全策を導くことだった。',
      },
    ],
    completionMessage:
      '全社展開の技術基盤が完成。テスト中の事故未遂から学んだ安全策——MCP設定の共有管理、フックによるデプロイ前チェック、スキルの権限設計。失敗を経験したからこそ、50人が安全に使える設計ができました。',
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
        text: '来週月曜、中途入社のエンジニアが3人合流する。全員Claude Code未経験。前回の反省——前任者は口頭で「CLAUDE.md書いてね」とだけ伝えて、3人とも全然違うルールで書いてカオスになった。\n\n今回は「初日から戦力になれる環境」を用意する。まずは、個人設定とプロジェクト設定が混在しないよう管理方針を決めよう。',
      },
      { type: 'question', questionId: 'mem-004' },
      { type: 'question', questionId: 'mem-005' },
      {
        type: 'narrative',
        text: '管理方針が決まった。次に用意したいのが「新メンバーが /onboard と打てばプロジェクト構成を全部教えてくれるスキル」。README を読め、では誰も読まない。対話形式で教えてくれるスキルなら、5分でキャッチアップできる。',
      },
      { type: 'question', questionId: 'skill-004' },
      {
        type: 'narrative',
        text: 'スキルも配置できた。最後の仕上げ——CLAUDE.mdの書き方ルールを決めておこう。\n\n現場の教訓：「クリーンに書け」「ベストプラクティスに従え」のような曖昧な指示はClaude が解釈に迷い、毎回違う結果になる。「テストは必ず jest で書く」「コンポーネントは atoms/molecules/organisms に分類する」——Claude が従える具体性が必要だ。',
      },
      { type: 'question', questionId: 'bp-003' },
      { type: 'question', questionId: 'bp-006' },
      {
        type: 'narrative',
        text: '金曜夕方。オンボーディング用のドキュメントをSlackに投稿した。「月曜、ターミナルで /onboard って打ってみてください。あとは Claude が教えてくれます」\n\n3人から「こんなの初めてです、楽しみ」と返信が来た。月曜が待ち遠しい。',
      },
    ],
    completionMessage:
      'オンボーディング環境の準備完了。管理スコープの使い分け、対話型スキル、具体的なルール——「初日から戦力になれる環境」が整いました。前任者の二の舞はもうない。',
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
        text: '隣の席の佐藤さん、Claude Codeの操作が異常に速い。マウスに一切触らず、会話の中断も再開もキーボードだけでサクサクやっている。自分は毎回マウスでボタンをクリックしている。同じツールなのにこの差は何だ？\n\n「佐藤さん、ちょっと教えてもらえますか？」——まずは基本操作から。',
      },
      { type: 'question', questionId: 'key-003' },
      { type: 'question', questionId: 'key-005' },
      {
        type: 'narrative',
        text: '「それ覚えたら次これ」と佐藤さんが畳みかける。「テストが走ってる間、ボーッと待ってない？その時間に別の質問ができるよ。あとパーミッションモードの切り替え、毎回メニューから探してない？」\n\nどうやら中級テクニックがあるらしい。',
      },
      { type: 'question', questionId: 'key-006' },
      { type: 'question', questionId: 'key-008' },
      {
        type: 'narrative',
        text: '「最後にこれ」と佐藤さん。「長いプロンプトを書くとき、改行の入れ方を知らないとEnter押した瞬間に送信されて地味にイラッとするよ。これだけは初日に覚えるべきだった」',
      },
      { type: 'question', questionId: 'key-007' },
      {
        type: 'narrative',
        text: '教わったショートカットを早速使い始めた翌日。Claudeにリファクタを頼んだら、依頼していないファイルまで大量に書き換えてしまった。「うわ、これ全部戻したい...」\n\n佐藤さんがすかさず「教えてなかったな。それ、キーボードだけで巻き戻せるよ」。',
      },
      { type: 'question', questionId: 'key-002' },
      {
        type: 'narrative',
        text: '一瞬で元に戻った。「ありがとうございます、佐藤さん」\n\n翌週、自分もマウスに触らずClaude Codeを操作している。入力、中断、巻き戻し、並列作業——全部キーボードだけ。隣で佐藤さんがニヤリとしている。「もう教えることないな」',
      },
    ],
    completionMessage:
      '佐藤さんに教わったショートカットを一通り覚えた。操作だけでなく、ミスからの復旧もキーボードでできる。「手が速い人」は、間違えたときのリカバリも速い。',
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
        text: 'レガシーな決済モジュールのリファクタリング。影響範囲が42ファイル、テストが200件。1日では絶対に終わらない。\n\n初日の夕方、Claude Codeとの会話が長くなりすぎて異変に気づいた。「さっき話した PaymentProcessor のインターフェース、覚えてる？」と聞くと、微妙にズレた回答が返ってくる。コンテキストが溢れ始めている。',
      },
      { type: 'question', questionId: 'ses-003' },
      {
        type: 'narrative',
        text: 'リセットして仕切り直した。しかし教訓——「溢れてからリセット」では遅い。2日目は、コンテキストが逼迫する前に手を打ちたい。\n\n現場の知恵：大きなリファクタでは、会話の「賞味期限」を意識する。100往復もすれば初期の文脈は薄まっている。圧縮のタイミングを自分でコントロールできれば、3日でも5日でも戦える。',
      },
      { type: 'question', questionId: 'bp-075' },
      { type: 'question', questionId: 'ses-007' },
      {
        type: 'narrative',
        text: '圧縮のコツがわかった。ところで、リファクタに集中している最中にふと「あのAPIの引数なんだっけ？」と確認したくなることがある。普通に質問するとそのやり取りもコンテキストに入ってしまうが——実はコンテキストを消費せずにちょっとした質問ができる方法がある。',
      },
      { type: 'question', questionId: 'bp-074' },
      {
        type: 'narrative',
        text: '2日目終了。42ファイル中30ファイルの修正が完了した。残り12ファイルは明日。\n\nここで問題——明日の朝、新しいセッションを開いたら今日のコンテキストは消えている。「昨日の続き」を効率的に再開する方法を知っておかないと、毎朝30分のキャッチアップが発生してしまう。',
      },
      { type: 'question', questionId: 'ses-005' },
      { type: 'question', questionId: 'ses-009' },
      {
        type: 'narrative',
        text: '3日目の朝。再開して順調に進んでいたが、前回のセッションで許可した権限設定はリセットされていた。再開時にパーミッションがどうなるか知っておかないと、毎回「許可しますか？」の連打で時間を無駄にしてしまう。',
      },
      { type: 'question', questionId: 'ses-017' },
      {
        type: 'narrative',
        text: '3日目の夕方。パーミッションの再承認も手早く済ませ、全42ファイルの修正が完了した。200件のテストが全てグリーンに変わった。PRの差分は+2,400行、-1,800行。\n\n「初日にコンテキスト溢れで焦ったときはどうなるかと思ったけど、管理テクニックを覚えてからは快適だったな」——長丁場を乗り切る自信がついた。',
      },
    ],
    completionMessage:
      '3日がかりのリファクタが完了。コンテキストの「賞味期限」を意識し、圧縮・セッション再開・名前付き管理を使いこなせば、どんな長丁場でも戦えます。',
  },
  {
    id: 'scenario-tools',
    title: 'AI への頼み方で結果が変わる',
    description: '同じタスクでも、依頼の仕方で出力品質が劇的に変わる',
    icon: '🎯',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '同僚の鈴木さんが「Claude Code 使ってみたけど、出てくるコードがイマイチで...」と愚痴をこぼしている。聞くと、「ログイン機能作って」とだけ伝えたらしい。\n\nそれじゃ AI も困る。人間の同僚に「ログイン機能作って」と丸投げしたら怒られるのと同じだ。効果的な依頼の仕方を教えてあげよう。',
      },
      { type: 'question', questionId: 'bp-020' },
      { type: 'question', questionId: 'bp-026' },
      {
        type: 'narrative',
        text: '「なるほど、要件を具体的に伝えればいいのか！」と鈴木さん。早速試してみたが——AI が見当違いの方向に進み始めた。認証にJWTを使うと指定したのに、セッションベースの実装を始めている。\n\n「そういうときの対処法も知っておかないとね」。軌道修正のテクニックは、依頼テクニックと同じくらい重要だ。',
      },
      { type: 'question', questionId: 'bp-016' },
      { type: 'question', questionId: 'bp-014' },
      {
        type: 'narrative',
        text: '軌道修正できるようになった鈴木さん。しかし今度は「JWTの設定どうすればいい？」「テストフレームワークは？」「環境変数の渡し方は？」とAIから逆質問が次々来る。\n\n「毎回聞かれるのも面倒だな...」と鈴木さん。最初から必要な情報を渡しておけば、こうした往復自体を減らせる。',
      },
      { type: 'question', questionId: 'bp-013' },
      {
        type: 'narrative',
        text: '鈴木さんがさっそく実践している。すると「UIのここがおかしいんだけど、テキストで説明するの難しいな...」と言い出した。実は Claude Code にはスクリーンショットを直接見せる方法がある。「百聞は一見にしかず」はAI相手でも同じだ。',
      },
      { type: 'question', questionId: 'tool-023' },
      {
        type: 'narrative',
        text: '翌週、鈴木さんから Slack が来た。「Claude Code が神ツールになった。先週と同じツールとは思えない」\n\n同じAI、同じモデル、同じ料金。違うのは「頼み方」だけ。これを知っているかどうかで、AIが「使えないツール」にも「最強の相棒」にもなる。',
      },
    ],
    completionMessage:
      'AI への依頼テクニックをマスターした。具体的な要件提示、軌道修正、コンテキスト設計——「ツールの性能」ではなく「使い方」が成果を決めることを体験しました。',
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
        text: '情報システム部から呼び出しを受けた。「Claude Codeを全社導入したいそうですが、セキュリティ審査を通してもらわないと困ります」\n\n実は心当たりがある。先週、チームメンバーが .env ファイルごと Claude に渡して「これでDBに接続して」とやっていた。APIキーがプロンプトに含まれた状態だ。このまま50人に展開したら、機密情報がAIのコンテキストに流れ放題になる。まず、これを仕組みで防がないと。',
      },
      { type: 'question', questionId: 'ext-007' },
      {
        type: 'narrative',
        text: '機密情報のブロックをフックで実装した。情シスの田村さんが審査シートの次の項目を読み上げる。「コードレビューの品質はどう担保しますか？」\n\nこれも身に覚えがある。先月、AI レビューだけでマージしたPRに SQL インジェクション脆弱性が混入していた。AIは「コードが正しい」と判断したが、セキュリティの観点が抜けていた。「AI レビュー＝安全」ではない。人間のチェックとの組み合わせが必須だ。',
      },
      { type: 'question', questionId: 'bp-012' },
      { type: 'question', questionId: 'bp-004' },
      {
        type: 'narrative',
        text: '田村さんが次の項目を読み上げる。「承認なしで自律動作する場合の安全策は？」——auto modeの仕組みを正しく説明できないと「勝手にコード変えるんでしょ？」と門前払いだ。',
      },
      { type: 'question', questionId: 'bp-072' },
      {
        type: 'narrative',
        text: '田村さんが審査シートの最後のセクションに進む。「開発者が複数のClaudeを同時に動かした場合、同じファイルを同時に書き換えてコンフリクトしませんか？先月、手動マージで1日潰した部署があったと聞いています」\n\nこれは答えられないと審査が止まる。並列作業の安全策を具体的に示す必要がある。',
      },
      { type: 'question', questionId: 'bp-011' },
      { type: 'question', questionId: 'bp-041' },
      {
        type: 'narrative',
        text: '審査結果：合格。田村さんが「正直、最初は懐疑的でした。でも .env 漏洩対策、AI レビューの限界を認めた上での運用設計、並列作業の安全策——実際の失敗から学んだ対策だからこそ説得力がありました」\n\n「セキュリティ＝できないリスト」だと思っていたが、「できる＋安全設計＝チームの信頼」に変わった。この経験が一番の収穫だ。',
      },
    ],
    completionMessage:
      'セキュリティ審査に合格。.env漏洩、AIレビューの限界、並列コンフリクト——実際の失敗体験から学んだ対策だからこそ、情シスの信頼を勝ち取れました。',
  },
  {
    id: 'scenario-mcp',
    title: 'Slackの通知、DB確認、全部ターミナルで完結させたい',
    description: 'MCP サーバーで外部ツールを接続し、Claude Code の能力を拡張する',
    icon: '🔌',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '水曜の午後。チームの開発フローに不満がある。\n\n障害発生 → Slackで報告 → GA4でユーザー影響を確認 → DBでデータを調べる → エディタに戻って修正——毎回5つのウィンドウを行き来する。「全部ターミナルで完結すればいいのに」\n\nそこで思い出す。Claude Codeには MCP（Model Context Protocol）という仕組みがある。外部ツールを「プラグイン」のように接続して、Claude が直接 Slack を読んだり、DB にクエリを投げたりできるようにする仕組みだ。\n\nまずは GA4 のデータを Claude から直接クエリできるようにしたい。MCP サーバーの接続方式を選ぶところから始めよう。',
      },
      { type: 'question', questionId: 'ext-009' },
      {
        type: 'narrative',
        text: '接続方式がわかった。実際にサーバーを追加する。MCP サーバーは stdio トランスポートで動く Node.js スクリプトだ。`claude mcp add` コマンドで登録するが、引数の渡し方にコツがある。',
      },
      { type: 'question', questionId: 'ext-013' },
      { type: 'question', questionId: 'ext-036' },
      {
        type: 'narrative',
        text: 'MCP サーバーが動き始めた。Claude に「先週のアクティブユーザー数は？」と聞くと、GA4 のデータを取得して答えてくれる。\n\nしかし、登録した MCP サーバーが増えてくると管理が面倒になる。「あれ、このサーバーまだ使ってたっけ？」——CLI で一覧を確認して不要なものを削除する方法も知っておこう。',
      },
      { type: 'question', questionId: 'ext-045' },
      {
        type: 'narrative',
        text: 'MCP の整理ができた。ところで、MCP はツールだけでなく「リソース」も提供できる。DB のテーブル定義やファイルの内容など、Claude が @メンションで参照できる読み取り専用のデータソースだ。これを使えば「このスキーマに合うクエリを書いて」と頼めるようになる。',
      },
      { type: 'question', questionId: 'ext-023' },
      {
        type: 'narrative',
        text: '社内の Jira にある MCP サーバーを追加しようとしたところ、OAuth 認証が必要だった。API キーをベタ書きするのはセキュリティ的に NG だ。Claude Code が認証をどう処理するか知っておく必要がある。',
      },
      { type: 'question', questionId: 'ext-035' },
      {
        type: 'narrative',
        text: 'MCP サーバーが増えてきた。ところが、あるサーバーがプラグインを更新してツールの一覧が変わった。Claude は古いツールリストを使い続けるのか、それとも自動で追従するのか？',
      },
      { type: 'question', questionId: 'ext-006' },
      {
        type: 'narrative',
        text: '退社前にチームの Slack に投稿した。「Claude Code から直接 GA4 クエリ、DB スキーマ参照、Slack 通知が全部できるようになった。ウィンドウの行き来が激減。設定は .mcp.json をプルすれば全員同じ環境になる」\n\n後輩から即レスが来た。「マジですか、明日セットアップ手伝ってください！」',
      },
    ],
    completionMessage:
      'MCP で外部ツール連携を構築！接続方式の選択、サーバー管理、リソース参照、OAuth 認証——Claude Code の能力を「プラグイン」で自在に拡張する方法を体験しました。',
  },
  {
    id: 'scenario-cicd',
    title: 'PR レビュー、もう人間だけでやらなくていい',
    description: 'GitHub Actions に Claude Code を組み込んで PR の自動レビューとコード修正を実現する',
    icon: '⚙️',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '木曜の朝。チームの PR がレビュー待ちで 8 本溜まっている。リードエンジニアは自分一人。全部目を通すのに半日かかる。\n\n「Claude Code でレビュー自動化できないの？」とメンバーに聞かれた。実は Claude Code はターミナルだけでなく、CI/CD パイプラインの中でも動く。GitHub Actions に組み込めば、PR が作られるたびに自動でコードをレビューし、修正提案まで出してくれる。',
      },
      { type: 'question', questionId: 'cmd-080' },
      {
        type: 'narrative',
        text: 'GitHub Actions のセットアップができた。まずはシンプルなタスクから始めよう。\n\nCI の中で Claude にリントエラーを自動修正させる。これだけでも、PR のたびに「フォーマットが崩れてます」というレビューコメントを書く手間がなくなる。さらに `-p` フラグで非対話実行し、結果をスクリプトで受け取る方法も押さえておこう。',
      },
      { type: 'question', questionId: 'cmd-016' },
      { type: 'question', questionId: 'cmd-052' },
      {
        type: 'narrative',
        text: 'リント自動修正と `-p` フラグの基本がわかった。\n\n次は Claude Code Action の細かい設定だ。最大ターン数を絞ってコストを抑えたり、使用するモデルを指定したり——本番 CI に入れる前にこのあたりをチューニングしておこう。',
      },
      { type: 'question', questionId: 'cmd-081' },
      {
        type: 'narrative',
        text: 'パーミッションの設定ができた。次は実際のレビューワークフローを組む。\n\n理想は「PR が作られたら Claude が差分を読み、問題点をコメントし、可能なら修正コミットまで作る」という流れ。既存のテンプレートを使えば、PR のレビューコメント生成はすぐに始められる。',
      },
      { type: 'question', questionId: 'cmd-058' },
      { type: 'question', questionId: 'cmd-048' },
      {
        type: 'narrative',
        text: 'レビューが JSON で返ってくるが、このデータをどう活用するかが次の課題だ。結果を Slack に通知する、GitHub のコメントとして投稿する——出力形式を制御する方法を知っておこう。',
      },
      { type: 'question', questionId: 'cmd-072' },
      {
        type: 'narrative',
        text: '金曜の朝。昨夜マージされた 3 本の PR には、全て Claude のレビューコメントが付いていた。1 本は Claude が型エラーを見つけて修正コミットまで作っていた。\n\nメンバーの佐藤さんが言った。「レビュー待ち 8 本がゼロになるの、初めて見ました」\n\n人間のレビューが不要になったわけではない。だが「明らかなミス」を AI が先に潰してくれるおかげで、人間は「設計の妥当性」に集中できるようになった。',
      },
    ],
    completionMessage:
      'CI/CD に Claude Code を統合！GitHub Actions セットアップ、非対話モード、パーミッション管理、構造化出力——PR レビューの自動化で、チームのレビューボトルネックを解消する方法を体験しました。',
  },
  {
    id: 'scenario-legacy',
    title: '100万行のレガシーコード、地図を作れ',
    description: 'Grep/Glob/Read/Edit を駆使して巨大リポジトリの全体像を把握し、リファクタ計画を立てる',
    icon: '🗺️',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '月曜の朝。異動先のチームで、前任者が退職済みの決済マイクロサービスを引き継ぐことになった。ドキュメントはほぼゼロ。テストカバレッジ 12%。コード量は約 10 万行。\n\n「とりあえず全部読んで」は無理だ。Claude Code のツールを使って、効率的にコードベースの地図を作る。まず最初の一手——ファイルの全体像を掴もう。',
      },
      { type: 'question', questionId: 'tool-002' },
      {
        type: 'narrative',
        text: 'ファイル一覧が取れた。テストファイルは 47 個しかない。次はコードの中身を探る。\n\n「決済処理のエントリーポイントはどこだ？」——巨大リポジトリで関数やクラスの呼び出し箇所を探すのは、Grep の出番だ。ただし Grep と Glob は用途が違う。ファイル名のパターンマッチと、ファイル内容の正規表現検索を使い分ける必要がある。',
      },
      { type: 'question', questionId: 'tool-001' },
      { type: 'question', questionId: 'tool-048' },
      {
        type: 'narrative',
        text: '決済処理の主要ファイルを特定できた。次は中身を読む。\n\n500 行のコントローラファイルを発見した。全部読む必要はない——特定のメソッドだけ読めばいい。さらに、設定ファイルの 1 行だけ変更したい場面もある。Read と Edit の使い分けを正確に知っておこう。',
      },
      { type: 'question', questionId: 'tool-007' },
      { type: 'question', questionId: 'tool-003' },
      {
        type: 'narrative',
        text: 'コードの構造が見えてきた。ここで Claude に「このリポジトリの決済フローを図にして、リファクタリング計画を立てて」と大きなタスクを投げてみる。\n\nClaude は複数のツールを自律的に組み合わせる。Glob でファイルを探し、Read で中身を読み、Grep で参照を追い、最後に Edit で修正する。どんなツールが使われるかを把握しておこう。',
      },
      { type: 'question', questionId: 'tool-055' },
      { type: 'question', questionId: 'tool-005' },
      {
        type: 'narrative',
        text: 'リファクタリングが進んできた。新しい共通モジュールを作る必要がある。まだ存在しないファイルを作成するには、どのツールが適切か？さらに、編集したファイルを誤って Bash で削除してしまった場合のリカバリー方法も知っておこう。',
      },
      { type: 'question', questionId: 'tool-065' },
      {
        type: 'narrative',
        text: '金曜。5 日間でコードベースの全体像を把握し、テストを 30 本追加し、デッドコードを 8,000 行削除した。前任者が 3 ヶ月かけても作れなかった「コードベースの地図」が手元にある。\n\n上司に報告すると「え、もう改修計画まで出来てるの？」と驚かれた。秘密兵器は Grep/Glob/Read/Edit——4 つのツールの正しい使い分けだ。',
      },
    ],
    completionMessage:
      'レガシーコードの地図作りが完了！Grep/Glob でファイル探索、Read/Edit で精密な読み書き、エージェントの自律的なツール連携——巨大リポジトリを効率的に攻略する技術を体験しました。',
  },
  {
    id: 'scenario-skills',
    title: 'チーム専用コマンドを作りたい',
    description: 'カスタムスキルを作成して、チームの定型作業をスラッシュコマンドで自動化する',
    icon: '✨',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '水曜の昼。チームで毎週やっている作業がある。\n\n1. PR の差分を読む\n2. テストが網羅されているか確認する\n3. パフォーマンスへの影響をチェックする\n4. レビューコメントを定型フォーマットで書く\n\n毎回同じプロンプトを書くのが面倒だ。これを `/review-pr` 一発で実行できるようにしたい。Claude Code には「スキル」という仕組みがある。',
      },
      { type: 'question', questionId: 'skill-001' },
      {
        type: 'narrative',
        text: 'SKILL.md を作成した。次は細かい設定だ。\n\nスキルの先頭に YAML フロントマターを書く。名前、説明、引数のヒント——これらを設定すると、`/` を入力した時にオートコンプリートで表示される。ちゃんと設定しないと、チームメンバーが「このスキルどうやって使うの？」と迷子になる。',
      },
      { type: 'question', questionId: 'skill-021' },
      { type: 'question', questionId: 'skill-005' },
      {
        type: 'narrative',
        text: 'フロントマターの設定ができた。早速テストしてみると、テスト実行結果の大量出力がスキルのコンテキストを圧迫して、肝心のレビューコメントが途中で切れてしまった。出力を効率的に扱う設計が必要だ。\n\nさらに、レビューは差分を読むだけなので最高性能のモデルは不要。速くて安い Haiku を指定すれば、大量の PR を高速に捌ける。',
      },
      { type: 'question', questionId: 'skill-006' },
      { type: 'question', questionId: 'skill-014' },
      {
        type: 'narrative',
        text: '出力とモデルの最適化ができた。次はスキルの名前だ。`/review-pr` のようにハイフン区切りにするのか、`/reviewPr` のようにキャメルケースにするのか。チームメンバーが覚えやすい命名規則を採用しよう。',
      },
      { type: 'question', questionId: 'skill-053' },
      {
        type: 'narrative',
        text: '命名も決まった。次はスキルに動的なデータを渡す方法だ。レビュー対象の PR 番号は毎回変わる。引数を渡す仕組みを知っておこう。',
      },
      { type: 'question', questionId: 'skill-058' },
      {
        type: 'narrative',
        text: 'スキルが完成した。チームに共有する方法を決めよう。\n\nこのレビュースキルは「プロジェクト固有」だから `.claude/skills/` に置く。だが、コードフォーマットのような「全プロジェクト共通」のスキルは別の場所が適切だ。さらに、もし同じ名前のスキルが複数の場所にあったらどうなる？',
      },
      { type: 'question', questionId: 'skill-007' },
      { type: 'question', questionId: 'skill-059' },
      {
        type: 'narrative',
        text: '木曜の朝。Slack で `/review-pr` スキルを共有した。30 分後、後輩の山田さんから「これ最高です。毎回同じこと書くの苦痛だったんです」とメッセージが来た。\n\n「スキル = 再利用可能なプロンプト」。一度作ったら、チーム全員の毎日の作業が 1 コマンドに変わる。次は何を自動化しようか？',
      },
    ],
    completionMessage:
      'カスタムスキルの作成が完了！SKILL.md の構造、フロントマター設定、ツール制限、動的引数、バッククォート構文、スコープの優先順位——チームの定型作業をスラッシュコマンドで自動化する技術を体験しました。',
  },
  {
    id: 'scenario-parallel',
    title: 'スプリント最終日、3機能を同時に仕上げろ',
    description: 'worktree、並列セッション、バックグラウンド実行で複数タスクを同時に進める',
    icon: '🔀',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '金曜の朝。スプリント最終日なのに、認証機能・検索機能・通知機能の 3 つが全部未完了。1 つずつ順番にやっていたら間に合わない。\n\n「Claude Code で 3 つ同時に進められないの？」——実は、できる。ただし普通にターミナルを 3 つ開くだけだと、同じファイルを同時に編集してコンフリクトが起きる。安全に並列作業するための仕組みが Claude Code にはある。',
      },
      { type: 'question', questionId: 'ses-021' },
      {
        type: 'narrative',
        text: 'worktree で認証機能のブランチを隔離できた。次は検索機能。こちらは既存ブランチで作業中だが、テストの実行に 5 分かかる。テストの結果を待つ間に、別の作業を進めたい。',
      },
      { type: 'question', questionId: 'ses-096' },
      { type: 'question', questionId: 'cmd-013' },
      {
        type: 'narrative',
        text: 'テストをバックグラウンドで流しながら通知機能に着手。Claude に大きなログファイルの分析を頼んだが、メインセッションのコンテキストが圧迫されてきた。別のエージェントに委任して、メインセッションを軽く保つテクニックがある。',
      },
      { type: 'question', questionId: 'ext-005' },
      {
        type: 'narrative',
        text: '3 機能が並行して進んでいる。ところで午前中に認証機能で使った worktree セッション、名前を付けて管理しておかないと後で「あの作業どこいった？」になる。過去のセッションを名前で管理する方法を知っておこう。',
      },
      { type: 'question', questionId: 'ses-001' },
      { type: 'question', questionId: 'ses-023' },
      {
        type: 'narrative',
        text: '15 時。認証機能の PR がマージされた。検索機能のテストも通った。通知機能のコードレビューを受けている。\n\nマネージャーが通りかかって「3 機能とも今日中に出るの？」と聞いてきた。「はい、もう 2 つマージ済みです」——目が丸くなっている。\n\n並列作業の鍵は「安全な隔離」と「コンテキストの分離」。これを知らないと、コンフリクトとコンテキスト汚染で逆に遅くなる。',
      },
    ],
    completionMessage:
      'スプリント最終日を乗り切った！worktree による安全な並列開発、バックグラウンド実行、サブエージェントへの委任、セッション管理——複数タスクを同時に進める技術を体験しました。',
  },
  {
    id: 'scenario-context',
    title: 'コンテキストが溢れた、どうする？',
    description: 'コンテキストウィンドウの管理、圧縮、分割でセッションを長持ちさせる',
    icon: '🧠',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '水曜の午後。大規模リファクタリングの 2 日目。Claude と長時間やりとりしていたら、急に応答が遅くなり、以前の指示を忘れ始めた。「さっき言ったじゃん！」と思わず声が出る。\n\nこれは「コンテキストウィンドウの枯渇」だ。Claude が一度に保持できる情報量には上限がある。まずは今どれくらい使っているか確認しよう。',
      },
      { type: 'question', questionId: 'cmd-001' },
      { type: 'question', questionId: 'ses-016' },
      {
        type: 'narrative',
        text: 'コンテキストの 85% が使われていた。ここで取れる選択肢は 2 つ。「要点を残してコンテキストを圧縮する」か「新しいセッションでやり直す」か。\n\nまずは圧縮を試す。これまでの会話の要点は保持しつつ、トークンを回復する方法がある。さらに、圧縮する時に「リファクタリングの方針に集中して」と焦点を指定できる。',
      },
      { type: 'question', questionId: 'cmd-003' },
      { type: 'question', questionId: 'cmd-069' },
      {
        type: 'narrative',
        text: 'コンテキストが回復した。だが、また同じことが起きるのは時間の問題だ。\n\n根本的な対策を考える。大きなタスクは最初から分割すべきだった。さらに、作業中に「ちょっと別の質問」を挟みたい時、コンテキストを汚さずに聞ける方法がある。',
      },
      { type: 'question', questionId: 'bp-051' },
      { type: 'question', questionId: 'ses-025' },
      {
        type: 'narrative',
        text: 'コンテキスト管理の戦略が見えてきた。ところで、さっきリファクタの途中で後輩から「CI の設定も見てほしい」と頼まれた。ここでリファクタの会話に CI の話を混ぜると、コンテキストがごちゃごちゃになる。これには名前がある——',
      },
      { type: 'question', questionId: 'bp-037' },
      {
        type: 'narrative',
        text: '「Kitchen sink」を避けるには、タスクを切り替える前に `/clear` する。CI の質問は別セッションで片付けてからリファクタに戻ろう。\n\nさて、リファクタに戻ったが、型エラーの修正を 2 回指示しても直らない。同じ修正を何度も頼むのは時間の無駄だ。こういうときの最善手は？',
      },
      { type: 'question', questionId: 'bp-008' },
      {
        type: 'narrative',
        text: '2 回失敗したら `/clear` して、学んだことを含めた良いプロンプトで再出発——これが鉄則だ。最後に、もしコンテキストを使い切ってしまった場合の自動的な動作も知っておこう。Claude Code は黙って壊れるのではなく、自動的に対処する仕組みがある。',
      },
      { type: 'question', questionId: 'ses-106' },
      {
        type: 'narrative',
        text: '木曜。コンテキスト管理を意識しながらリファクタリングを再開。今度は「大タスク → サブタスクに分割 → それぞれ別セッション or サブエージェント」で進めた。タスク切替時は `/clear`。2 回失敗したらリセット。\n\n昨日は 2 時間で行き詰まったのに、今日は 1 日通してスムーズに作業できた。コンテキストは「見えない資源」——意識して管理するかどうかで、生産性が段違いになる。',
      },
    ],
    completionMessage:
      'コンテキスト管理をマスター！使用量の確認、圧縮と焦点指定、サブエージェントへの委任、タスク切替時の /clear、2回失敗したらリセット、自動コンパクション——Claude Code と長時間作業するための必須知識を体験しました。',
  },
  {
    id: 'scenario-claudemd',
    title: 'CLAUDE.mdをゼロから育てる',
    description: '効果的なCLAUDE.mdの書き方を実践で学ぶ',
    icon: '📝',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '新しい React プロジェクトを引き継いだ。ドキュメントは少なく、ビルド方法すらREADMEに書いていない。\n\n先輩が「CLAUDE.md を用意しておくと、Claudeが毎回プロジェクトのルールを覚えてくれるよ」と教えてくれた。まずは CLAUDE.md がどういうファイルなのか理解しよう。',
      },
      { type: 'question', questionId: 'mem-001' },
      {
        type: 'narrative',
        text: 'ゼロから CLAUDE.md を書くのは大変だ。実はプロジェクトを解析して雛形を自動生成する方法がある。',
      },
      { type: 'question', questionId: 'mem-003' },
      {
        type: 'narrative',
        text: '雛形ができた。しかし「コードはきれいに書いて」のような曖昧な指示では Claude は従ってくれないことがある。効果的な書き方にはコツがある。',
      },
      { type: 'question', questionId: 'mem-038' },
      { type: 'question', questionId: 'bp-020' },
      {
        type: 'narrative',
        text: 'CLAUDE.md が 300 行を超えてきた。全部を1ファイルに書くと読みにくい。ルールをモジュール化する方法を学ぼう。',
      },
      { type: 'question', questionId: 'mem-010' },
      { type: 'question', questionId: 'mem-021' },
      {
        type: 'narrative',
        text: 'CLAUDE.md が完成した。自動生成から始めて、具体的な指示を書き、ルールをモジュール化する——この流れを覚えておけば、どんなプロジェクトでも Claude Code の力を最大限引き出せる。',
      },
    ],
    completionMessage:
      'CLAUDE.md マスターへの第一歩！雛形の自動生成、効果的な書き方、ルールのモジュール化を学びました。プロジェクトに合わせて育てていきましょう。',
  },
  {
    id: 'scenario-planmode',
    title: 'Plan モードで設計してから実装',
    description: 'いきなりコードを書かず、計画を立ててから実装するワークフロー',
    icon: '📐',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '水曜の午後。「認証機能を追加して」と一言で指示したら、Claude が既存のルーティングを壊してしまった。git reset --hard で元に戻して仕切り直し。\n\n隣の席の佐藤さんが「大きなタスクは Plan モードで設計してからコードを書かせるといいよ。私もこの間やらかして学んだ」と教えてくれた。',
      },
      { type: 'question', questionId: 'cmd-035' },
      {
        type: 'narrative',
        text: 'Plan モードに切り替えると、Claude はファイルを変更せず設計案だけを返してくれた。\n\n「認証には JWT を使い、ミドルウェアは src/middleware/ に配置、テストは __tests__/ に」——この設計を確認してから実装に進もう。ところで、コンテキストウィンドウには何が入っているのだろう？',
      },
      { type: 'question', questionId: 'ses-172' },
      {
        type: 'narrative',
        text: '設計が決まった。次は実装フェーズ。大きな変更は一度に頼むと品質が下がる。段階的に依頼するのがコツだ。',
      },
      { type: 'question', questionId: 'bp-002' },
      { type: 'question', questionId: 'bp-029' },
      {
        type: 'narrative',
        text: '実装が8割完了。しかし会話が長くなってきた。コンテキストを整理してから最後の仕上げに入ろう。',
      },
      { type: 'question', questionId: 'ses-174' },
      {
        type: 'narrative',
        text: 'コンテキストを圧縮して仕上げのテストを書いた。PR を作る前に、Claude に「テスト駆動」で残りを進めてもらう。',
      },
      { type: 'question', questionId: 'bp-001' },
      {
        type: 'narrative',
        text: 'Plan → Build のワークフローで認証機能が完成した。佐藤さんにも「今度からこのやり方でやるわ」と共有。「いきなりコードを書かない」——この原則を守るだけで、手戻りが激減する。',
      },
    ],
    completionMessage:
      'Plan → Build のワークフローを体験しました！設計フェーズを挟むだけで、コードの品質が劇的に上がります。コンテキスト管理も忘れずに。',
  },
  {
    id: 'scenario-workflow',
    title: '非エンジニアの業務自動化',
    description: 'プログラミング未経験でもClaude Codeで業務を効率化',
    icon: '💼',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '営業チームの山田さん（28歳）。Excel と Slack は使えるが、プログラミングは未経験。\n\n毎週金曜に3時間かけて作っている売上レポート。「Claude Code を使えば自動化できるらしい」と同僚に聞いた。「ターミナルって何？」というレベルだが、試してみることにした。',
      },
      { type: 'question', questionId: 'cmd-001' },
      {
        type: 'narrative',
        text: 'claude と打ってEnter。画面に「Claude Code へようこそ」と出た。\n\n「週次レポートの集計を自動化したい」と日本語で伝えたら、Python スクリプトを書いてくれた。だが実行する前に確認画面が出る。これが Claude Code の安全装置だ。',
      },
      { type: 'question', questionId: 'cmd-021' },
      {
        type: 'narrative',
        text: '確認画面で「Allow」を押した。スクリプトが動いて、Excel ファイルから自動集計された。すごい！\n\nだが「毎回 Allow を押すのが面倒」と思った山田さん。パーミッション設定を調べてみる。',
      },
      { type: 'question', questionId: 'bp-012' },
      { type: 'question', questionId: 'ext-163' },
      {
        type: 'narrative',
        text: 'スクリプトができた。毎週手動で実行するのは面倒だ。定期実行する方法はないだろうか？\n\nちなみに Claude Code のコストも気になる。月いくらかかるのだろう？',
      },
      { type: 'question', questionId: 'ses-175' },
      { type: 'question', questionId: 'cmd-016' },
      {
        type: 'narrative',
        text: '金曜の売上レポート、3時間 → 5分に短縮された。山田さんは浮いた時間で顧客対応に集中できるようになった。\n\n「日本語で指示するだけ」——プログラミングの知識がなくても、日常業務を効率化できることを体験した。',
      },
    ],
    completionMessage:
      'プログラミング未経験でも Claude Code で業務自動化ができることを体験しました！日本語で指示するだけ、コスト管理も忘れずに。',
  },
  {
    id: 'scenario-mcp-setup',
    title: 'MCP サーバーで外部ツール連携',
    description: 'Slack・DB・API と Claude Code をつなぐ',
    icon: '🔌',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '木曜のスプリントレビュー。PM から「Claude Code からデプロイ通知を Slack に飛ばせないの？」と言われた。\n\n調べてみると MCP（Model Context Protocol）を使えば外部ツールと連携できるらしい。まずは MCP の基本を理解しよう。',
      },
      { type: 'question', questionId: 'ext-001' },
      {
        type: 'narrative',
        text: '`.mcp.json` に Slack MCP サーバーの設定を書いた。しかし `claude` を起動しても「サーバーに接続できません」とエラーが出る。\n\nタイムアウトの設定や環境変数の確認が必要だ。',
      },
      { type: 'question', questionId: 'ext-025' },
      {
        type: 'narrative',
        text: 'タイムアウトを延ばしたら接続できた！次に DB クエリ用の MCP サーバーも追加する。MCP サーバーが増えるとツールが大量になり、コンテキストを圧迫する可能性がある。',
      },
      { type: 'question', questionId: 'ext-086' },
      { type: 'question', questionId: 'ses-176' },
      {
        type: 'narrative',
        text: '2つの MCP サーバーが動いた。しかしセキュリティを考えると、どのツールに何の権限を与えるか慎重に設定する必要がある。CI 環境で使う場合はさらに制限を強めたい。',
      },
      { type: 'question', questionId: 'ses-069' },
      { type: 'question', questionId: 'ext-166' },
      {
        type: 'narrative',
        text: 'Slack 通知と DB クエリが Claude Code から実行できるようになった。PM に見せたら「これはすごい！全チームに展開しよう」と大喜び。MCP は Claude Code を「業務プラットフォーム」に進化させる鍵だ。',
      },
    ],
    completionMessage:
      'MCP サーバーの接続・設定・セキュリティを体験しました！外部ツールとの連携で Claude Code の可能性が広がります。',
  },
  {
    id: 'scenario-cicd-setup',
    title: 'CI/CD に Claude Code を組み込む',
    description: 'GitHub Actions で PR レビューとイシュー対応を自動化',
    icon: '⚙️',
    difficulty: 'advanced',
    steps: [
      {
        type: 'narrative',
        text: '金曜のレトロスペクティブ。「PR レビューのボトルネックで今週3回リリースが遅れた」とメンバーから指摘された。\n\nTech Lead の鈴木さんが「Claude Code を GitHub Actions に組み込めば、最初のパスのレビューを自動化できる」と提案。週末に検証することにした。',
      },
      { type: 'question', questionId: 'cmd-025' },
      {
        type: 'narrative',
        text: 'GitHub Actions のワークフロー YAML を書いた。PR が作成されたら Claude Code を起動してコードレビューを実行する。\n\nだが CI 環境では対話的な操作ができない。Claude Code をどうやって非対話モードで動かす？',
      },
      { type: 'question', questionId: 'cmd-053' },
      { type: 'question', questionId: 'ses-041' },
      {
        type: 'narrative',
        text: 'ヘッドレスモードで動いた！しかし CI で自由にコマンドを実行されるのはセキュリティリスクだ。許可するツールを制限しよう。',
      },
      { type: 'question', questionId: 'ext-166' },
      {
        type: 'narrative',
        text: 'セキュリティ設定も完了。さらに定期的なタスク——毎朝のイシュートリアージや依存関係チェック——もスケジュール実行したい。',
      },
      { type: 'question', questionId: 'cmd-108' },
      { type: 'question', questionId: 'cmd-032' },
      {
        type: 'narrative',
        text: '月曜のスタンドアップ。PR が作成されるたびに自動レビューが走り、イシューも毎朝トリアージ済み。鈴木さんが「レビュー待ちが1日から2時間に短縮された」と報告。チームから拍手が起きた。',
      },
    ],
    completionMessage:
      'CI/CD パイプラインへの Claude Code 統合を体験しました！自動レビュー、セキュリティ制限、スケジュール実行でチームの開発サイクルが加速します。',
  },
  {
    id: 'scenario-dotclaude',
    title: '.claude フォルダを理解する',
    description: 'CLAUDE.md、rules、skills、hooks、settings の全体像',
    icon: '📁',
    difficulty: 'beginner',
    steps: [
      {
        type: 'narrative',
        text: '入社2週間目の新人エンジニア。先輩のリポジトリを clone したら `.claude/` フォルダがあった。中には `CLAUDE.md`、`settings.json`、`rules/`、`skills/` と見慣れないファイルがたくさん。\n\n「これ全部何ですか？」と先輩に聞いたら「Claude Code の設定一式だよ」と言われた。一つずつ理解しよう。',
      },
      { type: 'question', questionId: 'mem-062' },
      {
        type: 'narrative',
        text: 'どのファイルを Git にコミットして、どれを `.gitignore` に入れるか理解した。次は CLAUDE.md の中身を見てみよう。「プロジェクトルートの CLAUDE.md」と「`.claude/` 内の CLAUDE.md」の違いは？',
      },
      { type: 'question', questionId: 'mem-016' },
      {
        type: 'narrative',
        text: 'CLAUDE.md の配置場所を理解した。次に `.claude/rules/` ディレクトリ。先輩は「ルールが多くなったらファイルを分割して管理する」と言っていた。',
      },
      { type: 'question', questionId: 'mem-010' },
      { type: 'question', questionId: 'mem-044' },
      {
        type: 'narrative',
        text: 'ルールは理解した。次は Skills と Hooks。先輩は「どちらも自動化だけど、目的が全然違う」と言っていた。',
      },
      { type: 'question', questionId: 'skill-001' },
      { type: 'question', questionId: 'ext-041' },
      {
        type: 'narrative',
        text: '最後に、今のセッションでどのファイルが実際に読み込まれているか確認してみよう。',
      },
      { type: 'question', questionId: 'mem-063' },
      {
        type: 'narrative',
        text: '.claude フォルダの全体像が見えた。先輩に「理解できました！」と報告したら「じゃあ次は自分でルールファイルを追加してみて」と課題をもらった。成長の第一歩だ。',
      },
    ],
    completionMessage:
      '.claude フォルダの全体像を理解しました！CLAUDE.md、rules、skills、hooks、settings——それぞれの役割と使い分けがわかれば、Claude Code のポテンシャルを最大限引き出せます。',
  },
  {
    id: 'scenario-claudemd-pruning',
    title: 'CLAUDE.mdダイエット作戦',
    description: '肥大化したCLAUDE.mdを公式ベストプラクティスに沿って刈り込む',
    icon: '✂️',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '木曜の午後。チームの CLAUDE.md が 400 行を超えた。最近「書いたルールを Claude が無視する」という報告が増えている。\n\nテックリードの田中さんが「肥大化した CLAUDE.md はアンチパターンだよ。刈り込もう」と言い出した。まず、公式が何をアンチパターンとしているか確認しよう。',
      },
      { type: 'question', questionId: 'mem-067' },
      {
        type: 'narrative',
        text: '公式推奨は「1ファイル 200 行以下」。今の 400 行は倍だ。まずは不要な記述を見つけて削る。\n\n田中さんが「TypeScript で書かれています」「src/ にソースコードがあります」という行を指さした。「これ、要る？」',
      },
      { type: 'question', questionId: 'mem-065' },
      { type: 'question', questionId: 'mem-070' },
      {
        type: 'narrative',
        text: 'コードから推論できる記述を削除して 280 行に。まだ多い。次に田中さんが気づいたのは、「インデントは 2 スペース」と「インデントは 4 スペース」が別の場所に書かれている矛盾だった。',
      },
      { type: 'question', questionId: 'mem-071' },
      {
        type: 'narrative',
        text: '矛盾を解消して 250 行に。残りの記述を見ると「テストは必ず書くこと」「コードはきれいに」のような曖昧なルールが多い。これでは Claude は従いにくい。',
      },
      { type: 'question', questionId: 'mem-069' },
      {
        type: 'narrative',
        text: '曖昧な指示を具体的に書き直した。ところで「全ての関数に JSDoc を書くこと」「全ファイルにヘッダーコメントを付けること」——こういう一般的ルールの羅列はどうだろう？',
      },
      { type: 'question', questionId: 'mem-074' },
      {
        type: 'narrative',
        text: '刈り込み完了！400 行 → 180 行に。翌日から「Claude がルールを無視する」という報告がゼロに。\n\nしかし1週間後、新メンバーの鈴木さんから「CLAUDE.md に書いたはずのルールが守られない」と相談があった。まず何を確認すべき？',
      },
      { type: 'question', questionId: 'mem-075' },
      {
        type: 'narrative',
        text: '`/memory` で確認したら、鈴木さんのルールファイルがロードされていなかった。パスの設定ミスだった。「まず読み込まれているか確認」——基本だけど大事なステップだ。',
      },
    ],
    completionMessage:
      'CLAUDE.md ダイエット完了！「コードから推論できる情報は書かない」「矛盾を除去」「具体的・検証可能に」「過剰なルールを刈り込む」——この4原則で、簡潔で効果的な CLAUDE.md を維持しましょう。',
  },
  {
    id: 'scenario-hidden-gems',
    title: 'まだ知らないパワー機能',
    description: 'Claude Code 作成者も推す、多くの人が見落としている機能を体験する',
    icon: '💎',
    difficulty: 'intermediate',
    steps: [
      {
        type: 'narrative',
        text: '金曜の午後。Claude Code を3ヶ月使い込んだあなた。基本操作は完璧——だが、社内勉強会で発表者が見せた機能の半分を知らなかった。\n\n「Claude Code の作成者が "ほとんどの人が知らない" と言うパワー機能が15個あるらしい」。まずは、会話の途中で「別の方向も試してみたい」と思った時に使える機能から。',
      },
      { type: 'question', questionId: 'cmd-112' },
      {
        type: 'narrative',
        text: '`/branch` でセッションを分岐できるのか。Git ブランチではなく「会話のブランチ」——面白い。\n\nところで先日、React から Solid への移行が必要になった。100ファイル超。1つずつ手で直していたら日が暮れる。「大規模な変更を一気に並列処理するコマンドがある」と聞いたが——',
      },
      { type: 'question', questionId: 'cmd-113' },
      {
        type: 'narrative',
        text: '`/batch` でタスクを5〜30に分解して並列実行。各エージェントが独立した git worktree で動く。これは強力だ。\n\n次に、CI パイプラインから Claude Code を呼び出すスクリプトを書いている同僚がいた。「起動が遅い」と嘆いていたが、Skills も Hooks も MCP も要らないなら——',
      },
      { type: 'question', questionId: 'cmd-114' },
      {
        type: 'narrative',
        text: '`--bare` で拡張を全スキップ。スクリプトからの自動実行なら十分だ。\n\n次は開発中のWebアプリ。実装した UI を確認するために、ブラウザとターミナルを行き来するのが面倒だった。Desktop アプリにはもっとスマートな方法がある。',
      },
      { type: 'question', questionId: 'ext-172' },
      {
        type: 'narrative',
        text: 'Desktop アプリの埋め込みブラウザで dev サーバーをプレビュー。スクリーンショットも DOM 検査もアプリ内で完結する。\n\nさらに、Chrome 拡張機能を使えば CLI からもブラウザ操作ができるらしい。どんなことができるのか？',
      },
      { type: 'question', questionId: 'ext-170' },
      {
        type: 'narrative',
        text: 'コンソールエラーの読み取り、フォームテスト、Web ページからのデータ抽出——ブラウザ連携で自動化の幅が大きく広がる。\n\n最後に。長時間のコーディングで手が疲れた金曜の夕方。タイピングせずにプロンプトを入力する方法がある。',
      },
      { type: 'question', questionId: 'cmd-115' },
      {
        type: 'narrative',
        text: '`/voice` でスペースバーを押しながら話すだけ。手が疲れた夕方には最高だ。\n\n6つのパワー機能を知った。「知っている」と「使いこなせる」は違う——週末に1つずつ試してみよう。月曜にはチームの誰よりも速くなっているはずだ。',
      },
    ],
    completionMessage:
      'パワー機能を6つ発見！/branch（会話の分岐）、/batch（大規模並列処理）、--bare（最小モード）、Desktop ブラウザ、Chrome 拡張、/voice（音声入力）——これらを使い分けると、Claude Code の生産性が一段上がります。',
  },
]
