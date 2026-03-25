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
    intro: 'あなたが学んだことを、チームにも共有しましょう。AI 駆動開発は一人では完結しません。チーム全体で取り組むことで、本当の変革が起こります。',
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
    remaining: (m, s) => `残り時間 ${m}分${s}秒`,
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
}

// ============================================================
// アクティブロケール
// ============================================================

/** 現在のロケール設定。別言語に切り替える場合はここを差し替える */
export const locale: LocaleConfig = ja
