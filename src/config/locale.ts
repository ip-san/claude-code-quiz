/**
 * ロケール設定 — UI テキストを一元管理
 *
 * このファイルを差し替えるだけで、アプリ全体の言語を切り替えられる。
 * テーマ固有テキスト（アプリ名、カテゴリ名等）は theme.ts が管理し、
 * 汎用UIテキスト（ボタンラベル、フィードバック等）はこのファイルが管理する。
 */

export interface LocaleConfig {
  // === Common ===
  readonly common: {
    readonly start: string
    readonly close: string
    readonly back: string
    readonly next: string
    readonly copied: string
    readonly questionSuffix: string
    readonly categorySuffix: string
    readonly approxMinutes: string
  }

  // === Welcome ===
  readonly welcome: {
    readonly startButton: string
  }

  // === Quiz Feedback ===
  readonly feedback: {
    readonly correct: string
    readonly incorrect: string
    readonly explanation: string
    readonly yourAnswer: string
    readonly correctAnswer: string
    readonly whyWrong: string
    readonly officialDocs: string
    readonly openDocs: string
    readonly copyMarkdown: string
    readonly markdownCopied: string
    readonly copyExplanation: string
    readonly aiLearnMore: string
    readonly promptCopied: string
    readonly actionButtons: string
    readonly prompts: {
      readonly explain: { label: string; description: string }
      readonly practical: { label: string; description: string }
      readonly compare: { label: string; description: string }
    }
  }

  // === Quiz Card ===
  readonly quizCard: {
    readonly noQuestions: string
    readonly bookmark: string
    readonly unbookmark: string
    readonly hint: string
    readonly usedHint: string
    readonly multiSelectGroup: string
    readonly singleSelectGroup: string
    readonly retryButton: string
    readonly retryLabel: string
  }

  // === Quiz Result ===
  readonly result: {
    readonly firstCongrats: string
    readonly reviewNote: string
    readonly starRating: string
    readonly nextRecommendation: string
    readonly tomorrowAction: string
    readonly passing: string
    readonly notPassing: string
    readonly nextStep: string
    readonly learnedAction: string
  }

  // === Certificate ===
  readonly certificate: {
    readonly congrats: string
    readonly canIssue: string
    readonly namePlaceholder: string
    readonly nameLabel: string
    readonly generating: string
    readonly download: string
  }

  // === Menu ===
  readonly menu: {
    readonly historyLabel: string
    readonly shortcutsLabel: string
    readonly themeToggle: string
    readonly answered: string
    readonly modeSection: string
    readonly otherModes: string
    readonly difficultySection: string
    readonly checkUpdate: string
  }

  // === Search ===
  readonly search: {
    readonly placeholder: string
    readonly label: string
    readonly closeLabel: string
    readonly noResults: string
    readonly resultsSuffix: string
    readonly searchResultsFor: string
  }

  // === Daily ===
  readonly daily: {
    readonly todaysPlan: string
    readonly reviewPrefix: string
    readonly goalPrefix: string
    readonly achieved: string
    readonly dailyGoalLabel: string
    readonly dailyGoalProgress: string
  }

  // === Streak ===
  readonly streak: {
    readonly daySuffix: string
    readonly consecutive: string
    readonly amazing20: string
    readonly great10: string
    readonly nice5: string
  }

  // === Progress ===
  readonly progress: {
    readonly title: string
    readonly totalAnswers: string
    readonly correctCount: string
    readonly accuracy: string
    readonly sessionCount: string
    readonly bestAccuracy: string
    readonly growthTrend: string
    readonly teachable: string
    readonly teachableDesc: string
    readonly accuracyPrefix: string
    readonly weakChallenge: string
    readonly exportLabel: string
    readonly importLabel: string
    readonly csvExport: string
    readonly resetLabel: string
    readonly chartTitle: string
    readonly chartLabel: string
    readonly past: string
    readonly latest: string
  }

  // === Mastery ===
  readonly mastery: {
    readonly nextPrefix: string
    readonly nextLevelProgress: string
    readonly maxLevel: string
  }

  // === Team Share ===
  readonly teamShare: {
    readonly heading: string
    readonly intro: string
    readonly copyButton: string
    readonly copyHint: string
  }

  // === Skills Acquired ===
  readonly skills: {
    readonly heading: string
  }

  // === Personal Best ===
  readonly personalBest: {
    readonly updated: string
  }

  // === Resume Session ===
  readonly resumeSession: {
    readonly discardLabel: string
    readonly discardButton: string
  }

  // === Install Prompt ===
  readonly install: {
    readonly useAsApp: string
  }

  // === Diagrams ===
  readonly diagrams: {
    readonly hierarchy: string
    readonly cycle: string
    readonly comparison: string
    readonly flow: string
    readonly highPriority: string
    readonly lowPriority: string
  }

  // === Timer ===
  readonly timer: {
    readonly remaining: (minutes: number, seconds: number) => string
  }

  // === Recommendation ===
  readonly recommendation: {
    readonly heading: string
    readonly newArea: string
    readonly allMastered: string
    readonly growthArea: string
    readonly expertGoal: string
    readonly retention: string
  }

  // === Weak Point ===
  readonly weakPoint: {
    readonly heading: string
  }

  // === Session History ===
  readonly sessionHistory: {
    readonly modes: Record<string, string>
  }

  // === Reader ===
  readonly reader: {
    readonly title: string
    readonly subtitle: string
    readonly allQuestions: string
    readonly bookmarked: string
    readonly wrongAnswers: string
    readonly weakAreas: string
    readonly unanswered: string
    readonly noResults: string
    readonly correctAnswer: string
    readonly countLabel: (filtered: number, total: number) => string
  }

  // === Streak Banner ===
  readonly streakBanner: {
    readonly milestones: {
      readonly day100: string
      readonly day60: string
      readonly day30: string
      readonly day14: string
      readonly day7: string
      readonly day3: string
    }
  }

  // === Tutorial ===
  readonly tutorial: {
    readonly skip: string
    readonly slideLabel: (index: number) => string
    readonly prevLabel: string
    readonly slides: ReadonlyArray<{
      readonly title: string
      readonly description: string
      readonly tip?: string
    }>
    readonly terminalYou: string
    readonly terminalClaude: string
    readonly terminalPrompt: string
    readonly terminalReply: string
    readonly terminalReplyCont: string
    readonly bubbles: readonly string[]
    readonly capabilities: ReadonlyArray<{ readonly label: string }>
    readonly pathSteps: ReadonlyArray<{
      readonly label: string
      readonly desc: string
    }>
  }

  // === Chapter Intro ===
  readonly chapterIntro: {
    readonly mistakesOkTitle: string
    readonly mistakesOkBody: string
    readonly learningPointsHeading: string
    readonly startLearning: string
    readonly startChapter: string
  }

  // === Study First ===
  readonly studyFirst: {
    readonly title: string
    readonly subtitle: string
    readonly howToLearnTitle: string
    readonly howToLearnBody: string
    readonly afterLearning: string
    readonly doneReading: string
    readonly readingDoneTitle: string
    readonly readingDoneBody: (questionCount: number) => string
    readonly startQuiz: string
    readonly reread: string
    readonly backToChapters: string
  }

  // === First Time Guide ===
  readonly firstTimeGuide: {
    readonly beginnerLabel: string
    readonly beginnerDesc: string
    readonly quizLearnLabel: string
    readonly quizLearnDesc: string
    readonly readFirstLabel: string
    readonly readFirstDesc: string
    readonly experiencedLabel: string
    readonly experiencedDesc: string
  }

  // === Menu Header ===
  readonly menuHeader: {
    readonly openMenu: string
    readonly closeMenu: string
    readonly menuLabel: string
    readonly aboutClaude: string
    readonly aboutClaudeDesc: string
    readonly quizModes: string
    readonly scenarioLabel: string
    readonly scenarioDesc: string
    readonly bookmarkLabel: string
    readonly bookmarkSaving: (count: number) => string
    readonly bookmarkEmpty: string
    readonly bookmarkHint: string
    readonly progressDesc: string
    readonly readFirstLabel: string
    readonly readFirstDesc: string
    readonly lightMode: string
    readonly darkMode: string
    readonly keyboardShortcuts: string
    readonly checking: string
    readonly latestVersion: string
    readonly checkFailed: string
    readonly updateCheck: string
    readonly streakFooter: (streak: number, count: number, goal: number) => string
    readonly dailyGoalLabel: (count: number, goal: number) => string
    readonly quizModesButton: string
    readonly quizModesDesc: string
    readonly streakBadge: (days: number) => string
  }

  // === Weak Point (extended) ===
  readonly weakPointDetail: {
    readonly wrongCountLabel: (count: number, accuracy: number) => string
    readonly reviewButton: string
    readonly weakTopics: string
    readonly openDocLabel: (label: string) => string
  }

  // === Scenario ===
  readonly scenario: {
    readonly epilogue: string
    readonly beforeQuestion: (current: number, total: number) => string
    readonly nextButton: string
    readonly difficultyLabels: Record<string, string>
    readonly questionStats: (total: number, answered: number) => string
  }

  // === Category Picker ===
  readonly categoryPicker: {
    readonly title: string
    readonly cancel: string
    readonly dialogLabel: string
  }
}

// ============================================================
// 日本語ロケール（デフォルト）
// ============================================================

const ja: LocaleConfig = {
  common: {
    start: 'はじめる',
    close: '閉じる',
    back: '戻る',
    next: '次へ',
    copied: 'コピーしました',
    questionSuffix: '問',
    categorySuffix: 'カテゴリ',
    approxMinutes: '約5分',
  },

  welcome: {
    startButton: 'はじめる',
  },

  feedback: {
    correct: '正解！',
    incorrect: '不正解',
    explanation: '解説',
    yourAnswer: 'あなたの回答:',
    correctAnswer: '正解:',
    whyWrong: 'なぜこの回答が誤りなのか',
    officialDocs: '公式ドキュメント',
    openDocs: '公式ドキュメントを開く',
    copyMarkdown: 'Markdown形式でコピー',
    markdownCopied: 'Markdownをコピーしました',
    copyExplanation: '解説をコピー',
    aiLearnMore: 'AIにもっと教えてもらう',
    promptCopied: 'プロンプトをコピーしました — Claude に貼り付けて聞いてみましょう',
    actionButtons: 'アクションボタン',
    prompts: {
      explain: { label: '噛み砕いて解説', description: '例え話で初心者にもわかりやすく' },
      practical: { label: '実践シナリオ', description: '開発現場での具体的な活用例' },
      compare: { label: '比較・使い分け', description: '類似機能との違いと判断基準' },
    },
  },

  quizCard: {
    noQuestions: '該当する問題がありません',
    bookmark: 'ブックマークに追加',
    unbookmark: 'ブックマークを解除',
    hint: 'ヒント',
    usedHint: '使用したヒント',
    multiSelectGroup: '複数選択回答',
    singleSelectGroup: '回答選択肢',
    retryButton: 'もう一度挑戦',
    retryLabel: 'この問題をもう一度挑戦する (R)',
  },

  result: {
    firstCongrats: 'はじめの一歩、おめでとうございます',
    reviewNote: '復習モード — スコア非反映',
    starRating: 'つ星の評価',
    nextRecommendation: '次のおすすめ',
    tomorrowAction: '明日やること',
    passing: '✅ 合格！',
    notPassing: '📚 もう少し！',
    nextStep: 'Next Step',
    learnedAction: '学んだ知識を実践してみましょう',
  },

  certificate: {
    congrats: '合格おめでとうございます！',
    canIssue: '証明書を発行できます',
    namePlaceholder: 'お名前を入力',
    nameLabel: '証明書に記載するお名前',
    generating: '生成中...',
    download: '証明書をダウンロード',
  },

  menu: {
    historyLabel: '学習履歴',
    shortcutsLabel: 'キーボードショートカット',
    themeToggle: 'テーマ切替',
    answered: '問 解答済み',
    modeSection: 'モード',
    otherModes: 'その他',
    difficultySection: '難易度',
    checkUpdate: '更新を確認',
  },

  search: {
    placeholder: '例: CLAUDE.md, MCP, hooks',
    label: '問題を検索',
    closeLabel: '検索を閉じる',
    noResults: '該当する問題が見つかりません',
    resultsSuffix: '件',
    searchResultsFor: 'の検索結果',
  },

  daily: {
    todaysPlan: '今日のプラン',
    reviewPrefix: '復習: ',
    goalPrefix: '目標: あと',
    achieved: '達成！',
    dailyGoalLabel: '今日の目標進捗',
    dailyGoalProgress: '1日の目標問題数',
  },

  streak: {
    daySuffix: '日連続',
    consecutive: '連続正解',
    amazing20: '圧巻！',
    great10: '絶好調！',
    nice5: 'すごい！',
  },

  progress: {
    title: '学習進捗',
    totalAnswers: '総回答数',
    correctCount: '正解数',
    accuracy: '正答率',
    sessionCount: 'セッション数',
    bestAccuracy: '最高正答率',
    growthTrend: '成長トレンド',
    teachable: '教えられるカテゴリ',
    teachableDesc: '正答率90%以上 — このカテゴリはチームに教えられるレベルです',
    accuracyPrefix: '正答率: ',
    weakChallenge: '苦手問題に挑戦する',
    exportLabel: '学習履歴をエクスポートする',
    importLabel: '学習履歴をインポートする',
    csvExport: 'CSVでエクスポート',
    resetLabel: '学習履歴をリセットする',
    chartTitle: '学習推移',
    chartLabel: 'セッション正答率の推移グラフ',
    past: '過去',
    latest: '最新',
  },

  mastery: {
    nextPrefix: '次: ',
    nextLevelProgress: '次のレベルへの進捗',
    maxLevel: '最高レベル到達。あなたはチームのAI駆動開発を牽引できます。',
  },

  teamShare: {
    heading: 'チームに広げる',
    intro:
      'あなたが学んだことを、チームにも共有しましょう。AI 駆動開発は一人では完結しません。チーム全体で取り組むことで、本当の変革が起こります。',
    copyButton: 'チームへの提案メッセージをコピー',
    copyHint: 'Slack やメールにそのまま貼り付けられます',
  },

  skills: {
    heading: 'あなたが身につけたこと',
  },

  personalBest: {
    updated: '自己ベスト更新！',
  },

  resumeSession: {
    discardLabel: '保存されたセッションを破棄',
    discardButton: '破棄',
  },

  install: {
    useAsApp: 'アプリとして使う',
  },

  diagrams: {
    hierarchy: '階層図',
    cycle: '循環図',
    comparison: '比較図',
    flow: 'フロー図',
    highPriority: '▲ 高優先',
    lowPriority: '低優先 ▼',
  },

  timer: {
    remaining: (minutes, seconds) => `残り時間 ${minutes}分${seconds}秒`,
  },

  recommendation: {
    heading: 'おすすめの学習',
    newArea: '新しい分野に挑戦',
    allMastered: '全カテゴリ習得！',
    growthArea: '伸びしろのある分野',
    expertGoal: 'エキスパートを目指す',
    retention: '知識の定着',
  },

  weakPoint: {
    heading: '伸びしろのある分野',
  },

  sessionHistory: {
    modes: {
      full: '実力テスト',
      category: 'カテゴリ別',
      random: 'ランダム',
      weak: '苦手克服',
      custom: 'カスタム',
      bookmark: 'ブックマーク',
      overview: '全体像',
      unanswered: '未回答',
      review: '復習',
      quick: '60秒チェック',
    },
  },

  reader: {
    title: '解説リーダー',
    subtitle: '解説をリファレンスとして閲覧',
    allQuestions: '全問',
    bookmarked: '保存済み',
    wrongAnswers: '間違えた問題',
    weakAreas: '苦手な問題',
    unanswered: '未回答',
    noResults: '条件に一致する問題がありません',
    correctAnswer: '正解',
    countLabel: (filtered, total) => `${filtered} / ${total}件`,
  },

  streakBanner: {
    milestones: {
      day100: 'あなたはチームのAI推進を牽引できる存在です',
      day60: '2ヶ月の積み重ね。チームメンバーに学びを共有してみましょう',
      day30: '1ヶ月達成！後輩にAI活用を教えてみませんか',
      day14: '2週間連続！習慣が定着してきました',
      day7: '1週間連続！良い調子です',
      day3: '3日連続！この調子で続けましょう',
    },
  },

  tutorial: {
    skip: 'スキップ',
    slideLabel: (i) => `スライド ${i}`,
    prevLabel: '前へ',
    slides: [
      {
        title: 'Claude Code って何？',
        description:
          'ターミナル（黒い画面）で動く AI アシスタントです。日本語で話しかけるだけで、コードを書いたり、ファイルを編集したり、コマンドを実行してくれます。',
        tip: 'プログラミング経験がなくても使えます',
      },
      {
        title: '日本語で指示するだけ',
        description:
          '難しいコマンドを覚える必要はありません。やりたいことを日本語で伝えるだけで、AI が最適な方法を考えて実行してくれます。',
      },
      {
        title: 'AI ができること',
        description:
          'ファイルの読み書き、コード生成、バグ修正、テスト作成、ドキュメント生成など、開発作業の多くを AI がサポートしてくれます。',
        tip: '実行前に必ず確認があるので安心です',
      },
      {
        title: 'このクイズで学べること',
        description:
          'Claude Code の基本操作から応用テクニックまで、クイズ形式で楽しく学べます。間違えても解説付きなので、確実に知識が身につきます。',
      },
    ],
    terminalYou: 'あなた:',
    terminalClaude: 'Claude:',
    terminalPrompt: 'このプロジェクトの構成を教えて',
    terminalReply: 'このプロジェクトは React + TypeScript で',
    terminalReplyCont: '構成されています。主なディレクトリは...',
    bubbles: ['ログイン機能を追加して', 'このバグを直して', 'テストを書いて', 'コードをリファクタリングして'],
    capabilities: [
      { label: 'コード生成' },
      { label: 'ファイル編集' },
      { label: 'コマンド実行' },
      { label: '安全性チェック' },
    ],
    pathSteps: [
      { label: '基本操作を知る', desc: '全体像モード 6チャプター' },
      { label: '知識を確認する', desc: 'カテゴリ別・ランダム問題' },
      { label: '実力を試す', desc: '100問の実力テスト' },
    ],
  },

  chapterIntro: {
    mistakesOkTitle: '間違えても大丈夫！',
    mistakesOkBody:
      'このクイズは「テスト」ではなく「学習ツール」です。知らない問題が出ても、解説を読めば理解できるように作られています。 気軽に進めてください。',
    learningPointsHeading: 'このチャプターで学ぶこと',
    startLearning: '学習を始める',
    startChapter: 'チャプターを始める',
  },

  studyFirst: {
    title: '読んでから解く',
    subtitle: '解説を読んでからクイズに挑戦',
    howToLearnTitle: '学習の進め方',
    howToLearnBody:
      'チャプターを選んで、基礎的な解説を読みましょう。やさしい内容だけに絞っているので、 Claude Code を知らなくても読み進められます。',
    afterLearning: 'このチャプターを学んだら...',
    doneReading: '読み終えた',
    readingDoneTitle: '解説を読み終えました！',
    readingDoneBody: (questionCount) =>
      `学んだ内容を ${questionCount}問のクイズで確認しましょう。 解説を読んだ後なので、きっと解けるはずです。`,
    startQuiz: 'クイズに挑戦する',
    reread: 'もう一度読む',
    backToChapters: 'チャプター選択に戻る',
  },

  firstTimeGuide: {
    beginnerLabel: 'はじめての方へ',
    beginnerDesc: 'AI の知識は問いません。2つの学び方から選べます。',
    quizLearnLabel: 'クイズで学ぶ',
    quizLearnDesc: '問題を解きながら覚える（6チャプター構成）',
    readFirstLabel: '読んでから解く',
    readFirstDesc: '解説を読んでからクイズに挑戦',
    experiencedLabel: 'すでに活用されている方へ',
    experiencedDesc: '実力テスト・カテゴリ別など多様なモード',
  },

  menuHeader: {
    openMenu: 'メニューを開く',
    closeMenu: 'メニューを閉じる',
    menuLabel: 'メニュー',
    aboutClaude: 'Claude Code とは',
    aboutClaudeDesc: '基本を4画面で紹介',
    quizModes: 'クイズモード',
    scenarioLabel: '実践シナリオ',
    scenarioDesc: '実務に沿ったストーリーで学ぶ',
    bookmarkLabel: '後で学ぶ',
    bookmarkSaving: (count) => `${count}問を保存中`,
    bookmarkEmpty: '後で学ぶ',
    bookmarkHint: 'クイズ中に🔖をタップで保存できます',
    progressDesc: '統計・推移・AI活用レベル',
    readFirstLabel: '読んでから解く',
    readFirstDesc: '解説を読んでからクイズに挑戦',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
    keyboardShortcuts: 'キーボードショートカット',
    checking: '確認中...',
    latestVersion: '✓ 最新版です',
    checkFailed: '確認に失敗しました',
    updateCheck: '更新を確認',
    streakFooter: (streak, count, goal) => `🔥 ${streak}日連続学習 | 今日 ${count}/${goal}問`,
    dailyGoalLabel: (count, goal) => `今日の目標 ${count}/${goal}問`,
    quizModesButton: 'クイズモード',
    quizModesDesc: '全体像・実力テスト・カテゴリ別など',
    streakBadge: (days) => `🔥 ${days}日`,
  },

  weakPointDetail: {
    wrongCountLabel: (count, accuracy) => `${count}問 間違い · 正答率 ${accuracy}%`,
    reviewButton: '復習',
    weakTopics: '特に弱いトピック:',
    openDocLabel: (label) => `${label} のドキュメントを開く`,
  },

  scenario: {
    epilogue: 'エピローグ',
    beforeQuestion: (current, total) => `${current}/${total}問目の前に`,
    nextButton: '次へ',
    difficultyLabels: { beginner: '初級', intermediate: '中級', advanced: '上級' },
    questionStats: (total, answered) => `${total}問 · ${answered}/${total}回答済み`,
  },

  categoryPicker: {
    title: 'カテゴリを選択',
    cancel: 'キャンセル',
    dialogLabel: 'カテゴリを選択',
  },
}

// ============================================================
// アクティブロケール
// ============================================================

/** 現在のロケール設定。別言語に切り替える場合はここを差し替える */
export const locale: LocaleConfig = ja
