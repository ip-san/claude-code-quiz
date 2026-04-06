/**
 * 日本語ロケール
 *
 * 別言語を追加する場合:
 * 1. このファイルをコピーして en.ts 等を作成
 * 2. LocaleConfig の型に従ってテキストを翻訳
 * 3. locale.ts の activeLocale を切り替え
 */

import type { LocaleConfig } from '@/config/locale'
import { theme } from '@/config/theme'

export const ja: LocaleConfig = {
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
    tryOneQuestion: '今すぐ1問だけ試す',
    tryOneSessionLabel: '今すぐ1問',
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
    promptCopied: `プロンプトをコピーしました — ${theme.subject} に貼り付けて聞いてみましょう`,
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
    defaultHint: '公式ドキュメントを確認してみましょう。回答後に参照リンクが表示されます。',
    questionLabel: (index, answered) => `問題${index}${answered ? '（回答済み）' : ''}`,
    submitAnswer: '回答する',
    selectOption: '選択肢を選ぶ',
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
    placeholder: theme.searchPlaceholder,
    label: '問題を検索',
    closeLabel: '検索を閉じる',
    noResults: '該当する問題が見つかりません',
    resultsSuffix: '件',
    searchResultsFor: 'の検索結果',
    searchReference: '検索・リファレンス',
    inputPlaceholder: '例: CLAUDE.md, MCP, hooks',
    categoryFilterLabel: 'カテゴリフィルタ',
    allCategories: '全て',
    saved: '保存済み',
    learnLater: '後で学ぶ',
    challengeQuestions: (count) => `${count}問に挑戦`,
    showAllRemaining: (remaining) => `すべて表示（残り ${remaining}件）`,
    searchResultsTitle: (query) => `「${query}」の検索結果`,
    correctMark: (score, total) => `${score}/${total}問正解`,
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
    good3: 'いい調子！',
    streakMessage: (label, count) => `${label} ${count}問連続正解`,
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
    exported: 'エクスポートしました',
    exportFailed: 'エクスポートに失敗しました',
    imported: 'インポートしました',
    importFailed: 'インポートに失敗しました',
    invalidFile: '無効なファイル形式です',
    csvExported: 'CSVをエクスポートしました',
    csvExportFailed: 'CSVエクスポートに失敗しました',
    confirmOverwrite: '現在の学習履歴を上書きしますか？この操作は取り消せません。',
    confirmReset: '学習履歴をリセットしますか？この操作は取り消せません。',
    errorPrefix: 'エラー',
  },

  mastery: {
    nextPrefix: '次: ',
    nextLevelProgress: '次のレベルへの進捗',
    maxLevel: theme.masteryMaxMessage,
    totalXpLabel: (xp) => `累計 ${xp} XP`,
    avgXpLabel: (avg) => `（平均 ${avg} XP/問）`,
    xpTooltip: '正解+10 XP、不正解+2 XP、復習正解+15 XP',
    downloadCert: '修了証をダウンロード',
    levelReached: (name, req) => `${name}レベル到達（${req}）`,
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
    hasResume: '前回の続きがあります',
    resumeButton: '続きから',
    correctSuffix: '問正解',
  },

  install: {
    useAsApp: 'アプリとして使う',
    iosStep1: '共有ボタン（□↑）をタップ',
    iosStep2: '「ホーム画面に追加」をタップ',
    installApp: 'アプリをインストール',
    installDesc: 'ホーム画面に追加してアプリとして使えます',
    addButton: '追加',
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
    allMasteredMessage: '素晴らしい成果です。実力テストで総合力を試してみましょう。',
    fullTestAction: '実力テストに挑戦',
    growthArea: '伸びしろのある分野',
    expertGoal: 'エキスパートを目指す',
    retention: '知識の定着',
    retentionMessage: '苦手な問題を中心に復習して、知識を確実なものにしましょう。',
    weakModeAction: '苦手克服モード',
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
      quick: '復習チェック',
    },
    sessionLabel: (index) => `セッション${index}`,
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
    slides: theme.tutorialSlides,
    terminalYou: theme.tutorialTerminal.youLabel,
    terminalClaude: theme.tutorialTerminal.aiLabel,
    terminalPrompt: theme.tutorialTerminal.prompt,
    terminalReply: theme.tutorialTerminal.reply,
    terminalReplyCont: theme.tutorialTerminal.replyCont,
    bubbles: theme.tutorialBubbles,
    capabilities: theme.tutorialCapabilities,
    pathSteps: theme.tutorialPathSteps,
  },

  chapterIntro: {
    mistakesOkTitle: '間違えても大丈夫！',
    mistakesOkBody:
      'このクイズは「テスト」ではなく「学習ツール」です。知らない問題が出ても、解説を読めば理解できるように作られています。 気軽に進めてください。',
    learningPointsHeading: 'このチャプターで学ぶこと',
    startLearning: '学習を始める',
    startChapter: 'チャプターを始める',
  },

  chapterProgress: {
    retryChapter: 'もう一度挑戦',
    continueChapter: '続きから',
    startChapter: 'このチャプターを始める',
  },

  chapterComplete: {
    complete: '完了',
    wellDone: 'よくできました！次のチャプターに進みましょう。',
    reviewAdvice: '解説を見返して理解を深めましょう。',
    nextChapter: '次のチャプターへ',
    seeResults: '結果を見る',
    stopForToday: '今日はここまで',
    correctSuffix: (score, total) => `${score}/${total}問正解`,
  },

  studyFirst: {
    title: '読んでから解く',
    subtitle: '解説を読んでからクイズに挑戦',
    howToLearnTitle: '学習の進め方',
    howToLearnBody: theme.studyFirstHowToLearnBody,
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
    aboutClaude: theme.aboutLabel,
    aboutClaudeDesc: theme.aboutDesc,
    quizModes: 'クイズモード',
    scenarioLabel: '実践シナリオ',
    scenarioDesc: '実務に沿ったストーリーで学ぶ',
    bookmarkLabel: '後で学ぶ',
    bookmarkSaving: (count) => `${count}問を保存済み`,
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
    unansweredChallenge: '未回答に挑戦',
    unansweredChallengeDesc: 'まだ解いていない問題をカテゴリ別に',
    bookmarkList: 'ブックマーク一覧',
    bookmarkListDesc: '保存した問題の解説を確認',
    reloadApp: 'アプリをリロード',
    learningSection: '学習',
    referenceSection: 'リファレンス',
    settingsSection: '設定',
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

  encouragement: {
    messages: [
      '大丈夫。誰もが最初は間違えます',
      '間違えるほど記憶に残ります',
      'ここで諦めなければ、必ず力になります',
      '一つずつ。焦らなくて大丈夫です',
      'あなたのペースで進みましょう',
    ],
  },

  nextRecommend: {
    fullTest: '実力テストに挑戦',
    fullTestDesc: '100問で総合力を試してみませんか？',
    unansweredDesc: 'まだ解いていない分野に挑戦',
    randomTest: 'ランダム20問で腕試し',
    randomTestDesc: '知識の定着を確認しよう',
  },

  shortcuts: {
    quizSection: 'クイズ画面',
    selectOption: '選択肢を選ぶ',
    moveOption: '選択肢を移動',
    submitNext: '解答する / 次の問題へ',
    retry: '不正解をリトライ',
    shortcutSection: 'ショートカット',
    showHelp: 'このヘルプを表示',
    closeDialog: 'ダイアログを閉じる',
    title: 'ショートカット',
    showAnytime: 'でいつでも表示',
  },

  recommend: {
    analyzeLabel: 'あなたの利用履歴からレコメンド',
    analyzeDesc: 'AI があなたの作業意図を理解し、最適な復習問題を選びます',
    analyzing: '分析中...',
    analyzingProgress: '利用履歴を分析中',
    regenerating: 'AI が再生成中...',
    updateLabel: '問題を更新',
    whyThisQuestion: 'なぜこの問題？',
    close: '閉じる',
    improvementReport: 'あなたの改善レポート',
    improved: '改善',
    nextChallenge: '次の課題',
    relatedToTopics: (topics) => `${topics}に関連する問題を選びました`,
    sessionLabel: '利用履歴からのレコメンド',
    updated: '✓ 更新しました',
    quizEffect: 'クイズ効果',
    practiceScenario: '実践シナリオ',
    confirmWithQuiz: (count) => `クイズで確かめる（${count}問）`,
    questionCount: (n) => `${n}問`,
    timeSaved: (minutes) => `約${minutes}分短縮`,
    secondsLabel: (n) => `${n}秒`,
    setupTitle: '自動レコメンドを有効にしますか？',
    setupDesc: 'Claude Code の全セッション終了時にログを収集し、その日の作業に合ったクイズを自動で提案します',
    setupEnable: '有効にする',
    setupLater: '後で',
    setupDone: '設定完了。次回の Claude Code セッションから自動収集が始まります。',
    emptyTitle: 'Claude Code の利用履歴がまだありません',
    emptyDesc:
      'Claude Code でいくつか作業をしてから、もう一度お試しください。セッション終了時に自動でログが蓄積されます。',
  },

  retention: {
    labels: ['短期記憶', '定着中', '定着してきた', 'ほぼ定着', '長期記憶化'],
    remainingMessage: (n) => `あと${n}回正解で長期記憶`,
    meterLabel: '記憶定着度',
  },

  shareImage: {
    idle: '画像でシェア',
    generating: '生成中...',
    copied: 'クリップボードにコピー！',
    downloaded: 'ダウンロード完了！',
    streakLabel: '連続学習',
    levelLabel: 'レベル',
    scoreDetail: (score, total) => `${score} / ${total}問正解`,
    streakDays: (days) => `${days}日`,
  },

  snapshot: {
    reviewDue: (n) => `復習: ${n}問`,
    goalRemaining: (n) => `目標: あと${n}問`,
    lastSession: '前回の学習',
    hoursAgo: (n) => `${n}時間前`,
    daysAgo: (n) => `${Math.round(n)}日前`,
    forecastLabel: '復習予定',
    tomorrow: '明日',
    dayAfterTomorrow: '明後日',
    daysLater: (n) => `${n}日後`,
    noDataMessage: '新しい問題に挑戦して知識を広げましょう',
    todaysPlan: '今日のプラン',
    reviewAll: (n) => `🧠 ${n}問を復習`,
    reviewAllLabel: (n) => `復習期限の${n}問を全て復習する`,
    quickCheck: '⚡ 3問だけ',
    quickCheckLabel: '3問だけ素早くチェックする',
    randomChallenge: '🎲 サクッと10問',
    randomChallengeLabel: 'ランダムに10問チャレンジする',
    reviewDueStrong: (n) => `🧠 復習: ${n}問が期限を迎えています`,
    forecastCount: (n) => `${n}問`,
  },

  notification: {
    title: '復習リマインダー',
    desc: '復習期限が来たら通知でお知らせします',
    allow: '許可する',
    later: '今はしない',
  },
}
