import type { QuizFileData, QuizItemData } from '@/infrastructure/validation/QuizValidator'
import quizData from './quizzes.json'

/**
 * Default quiz set focusing on Claude Code fundamentals
 * Based on official documentation: https://docs.anthropic.com/en/docs/claude-code
 *
 * Total: 100 questions across 8 categories
 * - memory: 15 questions (CLAUDE.md, Memory files)
 * - skills: 15 questions (Skill creation, frontmatter)
 * - tools: 15 questions (Read, Write, Edit, Bash, Glob, Grep)
 * - commands: 15 questions (Built-in commands, /context, /compact)
 * - extensions: 15 questions (MCP, Hooks, Subagents, Plugins)
 * - session: 10 questions (Session management, context)
 * - keyboard: 10 questions (Shortcuts, Vim mode, UI)
 * - bestpractices: 5 questions (Effective usage, prompt design)
 */
export const defaultQuizData: QuizFileData = {
  title: quizData.title,
  description:
    'Claude Codeの基本から応用まで、公式ドキュメントに基づいた実践的な知識をテスト',
  version: quizData.version,
  quizzes: quizData.quizzes as QuizItemData[],
}

// Legacy export for compatibility
export const defaultQuizzes = defaultQuizData
