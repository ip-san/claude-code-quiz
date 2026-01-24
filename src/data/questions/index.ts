/**
 * Questions Index
 * Aggregates all category question files into a single export
 */
import { memoryQuestions } from './memory'
import { skillsQuestions } from './skills'
import { toolsQuestions } from './tools'
import { commandsQuestions } from './commands'
import { extensionsQuestions } from './extensions'
import { sessionQuestions } from './session'
import { keyboardQuestions } from './keyboard'
import { bestpracticesQuestions } from './bestpractices'
import type { QuizItem } from '@/types/quiz'

/**
 * All quiz questions combined
 * Total: 100 questions
 * - memory: 15 questions (CLAUDE.md, Memory files)
 * - skills: 15 questions (Skill creation, frontmatter)
 * - tools: 15 questions (Read, Write, Edit, Bash, Glob, Grep)
 * - commands: 15 questions (Built-in commands, /context, /compact)
 * - extensions: 15 questions (MCP, Hooks, Subagents, Plugins)
 * - session: 10 questions (Session management, context)
 * - keyboard: 10 questions (Shortcuts, Vim mode, UI)
 * - bestpractices: 5 questions (Effective usage, prompt design)
 */
export const allQuestions: QuizItem[] = [
  ...memoryQuestions,
  ...skillsQuestions,
  ...toolsQuestions,
  ...commandsQuestions,
  ...extensionsQuestions,
  ...sessionQuestions,
  ...keyboardQuestions,
  ...bestpracticesQuestions,
]

// Export individual category arrays for potential direct use
export {
  memoryQuestions,
  skillsQuestions,
  toolsQuestions,
  commandsQuestions,
  extensionsQuestions,
  sessionQuestions,
  keyboardQuestions,
  bestpracticesQuestions,
}
