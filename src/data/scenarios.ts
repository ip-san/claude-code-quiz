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
      { type: 'question', questionId: 'bp-002' },
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
        text: '全体像がわかった。まずDB連携から着手。MCPサーバーで社内DBにクエリを投げられるようにした——が、テスト中にヒヤリとする出来事が。開発環境のつもりが、本番DBに接続されていた。設定をバージョン管理してチーム全員で共有する仕組みがないと、50人展開時に同じ事故が起きる。\n\nフックの仕組みも把握しておこう。CTOの要件「デプロイ前に必ずテスト通す」には、フックが鍵になる。ただし「ツール実行前」と「ツール実行後」の2種類があり、間違えると「テスト通ってないのにデプロイされた」事故が起きる。',
      },
      { type: 'question', questionId: 'ext-010' },
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
      { type: 'question', questionId: 'ses-008' },
      {
        type: 'narrative',
        text: '3日目の朝。再開して順調に進んでいたら、PMから緊急連絡。「本番で軽微なバグが出てる。リファクタ作業を止めずに直せない？」——リファクタのブランチを汚さずに、別の隔離環境で緊急修正する方法がある。',
      },
      { type: 'question', questionId: 'ses-018' },
      {
        type: 'narrative',
        text: '3日目の夕方。緊急修正は worktree で隔離して対応し、リファクタ本体にも影響なし。全42ファイルの修正が完了し、200件のテストが全てグリーンに変わった。PRの差分は+2,400行、-1,800行。\n\n「初日にコンテキスト溢れで焦ったときはどうなるかと思ったけど、管理テクニックを覚えてからは快適だったな」——長丁場を乗り切る自信がついた。',
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
      { type: 'question', questionId: 'bp-001' },
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
        text: '水曜の午後。チームの開発フローに不満がある。\n\n障害発生 → Slackで報告 → GA4でユーザー影響を確認 → DBでデータを調べる → エディタに戻って修正——毎回5つのウィンドウを行き来する。「全部ターミナルで完結すればいいのに」\n\nそこで思い出す。Claude Codeには MCP（Model Context Protocol）という仕組みがある。外部ツールを「プラグイン」のように接続して、Claude が直接 Slack を読んだり、DB にクエリを投げたりできるようにする仕組みだ。',
      },
      { type: 'question', questionId: 'ext-001' },
      {
        type: 'narrative',
        text: 'まずはチーム全員が同じ MCP サーバーを使えるようにした。次は実際にサーバーを追加する。\n\nGA4 のデータを Claude から直接クエリできるようにしたい。MCP サーバーは stdio トランスポートで動く Node.js スクリプトだ。`claude mcp add` コマンドで登録するが、引数の渡し方にコツがある。',
      },
      { type: 'question', questionId: 'ext-013' },
      { type: 'question', questionId: 'ext-031' },
      {
        type: 'narrative',
        text: 'MCP サーバーが動き始めた。Claude に「先週のアクティブユーザー数は？」と聞くと、GA4 のデータを取得して答えてくれる。\n\nしかし、登録した MCP サーバーが増えてくると管理が面倒になる。「あれ、このサーバーまだ使ってたっけ？」——CLI で一覧を確認して不要なものを削除する方法も知っておこう。',
      },
      { type: 'question', questionId: 'ext-045' },
      {
        type: 'narrative',
        text: 'MCP の整理が終わった。ふと「MCP で提供できるのはツールだけ？」と疑問に思う。\n\n実は MCP はツール以外にも「リソース」を提供できる。ファイルやデータベースのスキーマなど、Claude が参照できる読み取り専用のデータソースだ。これを使えば、DB のテーブル定義を Claude に渡して「このスキーマに合うクエリを書いて」と頼めるようになる。',
      },
      { type: 'question', questionId: 'ext-011' },
      { type: 'question', questionId: 'ext-023' },
      {
        type: 'narrative',
        text: '夕方。ふと Claude に「今登録されてる MCP ツール、全部で何個ある？」と聞いたら、20個以上になっていた。しかし全部を毎回読み込むのは非効率だ。必要な時だけ検索して使う仕組みはないのか？',
      },
      { type: 'question', questionId: 'ext-024' },
      {
        type: 'narrative',
        text: '退社前にチームの Slack に投稿した。「Claude Code から直接 GA4 クエリ、DB スキーマ参照、Slack 通知が全部できるようになった。ウィンドウの行き来が激減。設定は .mcp.json をプルすれば全員同じ環境になる」\n\n後輩から即レスが来た。「マジですか、明日セットアップ手伝ってください！」',
      },
    ],
    completionMessage:
      'MCP で外部ツール連携を構築！チーム共有設定、stdio トランスポート、リソース参照、Tool Search——Claude Code の能力を「プラグイン」で自在に拡張する方法を体験しました。',
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
        text: 'GitHub Actions のセットアップができた。次は Claude Code を「非対話モード」で動かす方法を理解する必要がある。\n\nCI の中では人間がプロンプトを入力できない。ファイルの内容やコマンドの出力を「パイプ」で渡し、結果を受け取る。この仕組みを使いこなせれば、レビューだけでなくテスト生成やドキュメント更新も自動化できる。',
      },
      { type: 'question', questionId: 'cmd-031' },
      { type: 'question', questionId: 'cmd-052' },
      {
        type: 'narrative',
        text: 'パイプで入力を渡し、`-p` フラグで非対話実行する基本がわかった。\n\nだが本番の CI では「Claude にどこまでの権限を与えるか」が重要になる。テストの実行は OK だが、本番 DB への接続は絶対に NG。CI 環境でのパーミッション管理を正しく設定しないと、事故の元だ。',
      },
      { type: 'question', questionId: 'cmd-041' },
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
      { type: 'question', questionId: 'tool-024' },
      {
        type: 'narrative',
        text: '決済処理の主要ファイルを特定できた。次は中身を読む。\n\n500 行のコントローラファイルを発見した。全部読む必要はない——特定のメソッドだけ読めばいい。さらに、設定ファイルの 1 行だけ変更したい場面もある。Read と Edit の使い分けを正確に知っておこう。',
      },
      { type: 'question', questionId: 'tool-007' },
      { type: 'question', questionId: 'tool-003' },
      {
        type: 'narrative',
        text: 'コードの構造が見えてきた。ここで Claude に「このリポジトリの決済フローを図にして、リファクタリング計画を立てて」と大きなタスクを投げてみる。\n\nClaude は複数のツールを自律的に組み合わせる。Glob でファイルを探し、Read で中身を読み、Grep で参照を追い、最後に Edit で修正する——この一連の流れを「エージェント」と呼ぶ。',
      },
      { type: 'question', questionId: 'tool-029' },
      { type: 'question', questionId: 'tool-005' },
      {
        type: 'narrative',
        text: 'Claude が作ったリファクタ計画をレビューしている。Edit ツールでファイルを修正する前に、Claude は自動的にある操作を行う。これを知らないと「なぜ余分な Read が入るんだ？」と混乱するので押さえておこう。',
      },
      { type: 'question', questionId: 'tool-008' },
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
        text: 'フロントマターの設定ができた。ところが問題が発生した。\n\nこのレビュースキルはファイルの読み取りとテスト実行だけで十分なのに、Bash で任意のコマンドを実行できてしまう。デプロイスクリプトや DB マイグレーションを誤って実行されたら大事故だ。スキルに許可するツールを制限する方法を知る必要がある。',
      },
      { type: 'question', questionId: 'skill-002' },
      { type: 'question', questionId: 'skill-023' },
      {
        type: 'narrative',
        text: 'ツール制限ができた。次はスキルの中で動的にデータを取り込みたい。\n\nレビュー対象の PR 番号は毎回変わる。スキルに引数を渡す仕組み、さらにスキルの中から Git の最新情報を動的に埋め込む仕組みがある。',
      },
      { type: 'question', questionId: 'skill-058' },
      { type: 'question', questionId: 'skill-033' },
      {
        type: 'narrative',
        text: 'スキルが完成した。チームに共有する前に、もう一つ考えておくべきことがある。\n\nこのスキルは「プロジェクト固有」だから `.claude/skills/` に置く。だが、コードフォーマットのような「全プロジェクト共通」のスキルは `~/.claude/skills/` に置くべきだ。もし同じ名前のスキルが両方にあったらどうなる？',
      },
      { type: 'question', questionId: 'skill-059' },
      {
        type: 'narrative',
        text: '木曜の朝。Slack で `/review-pr` スキルを共有した。30 分後、後輩の山田さんから「これ最高です。毎回同じこと書くの苦痛だったんです」とメッセージが来た。\n\n「スキル = 再利用可能なプロンプト」。一度作ったら、チーム全員の毎日の作業が 1 コマンドに変わる。次は何を自動化しようか？',
      },
    ],
    completionMessage:
      'カスタムスキルの作成が完了！SKILL.md の構造、フロントマター設定、ツール制限、動的引数、バッククォート構文、スコープの優先順位——チームの定型作業をスラッシュコマンドで自動化する技術を体験しました。',
  },
]
