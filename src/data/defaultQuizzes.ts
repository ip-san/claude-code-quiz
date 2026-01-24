import type { QuizFile } from '@/types/quiz'
import { allQuestions } from './questions'

/**
 * Default quiz set focusing on Claude Code fundamentals
 * Based on official documentation: https://code.claude.com/docs/
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
export const defaultQuizData: QuizFile = {
  title: 'Claude Code マスタークイズ',
  description:
    'Claude Codeの基本から応用まで、公式ドキュメントに基づいた実践的な知識をテスト',
  version: '2.0.0',
  quizzes: allQuestions,
}

// Legacy export for compatibility
export const defaultQuizzes = defaultQuizData
