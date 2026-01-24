#!/usr/bin/env npx ts-node

/**
 * Claude Code Quiz Generator
 *
 * This script generates quiz questions based on Claude Code documentation structure.
 * It can be used to create prompts for AI-assisted quiz generation or to structure
 * existing content into quiz format.
 *
 * Usage:
 *   npx ts-node scripts/generate-quiz.ts
 *
 * Output:
 *   - Generates quiz-template.json with empty templates
 *   - Generates quiz-prompts.md with AI prompts for each section
 */

interface QuizTemplate {
  id: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  question: string
  options: Array<{ text: string; wrongFeedback?: string }>
  correctIndex: number
  explanation: string
  referenceUrl?: string
  tags?: string[]
}

interface DocumentSection {
  category: string
  title: string
  description: string
  topics: string[]
  referenceUrl: string
  targetQuestionCount: number
}

// Claude Code Documentation Structure
const DOCUMENTATION_SECTIONS: DocumentSection[] = [
  {
    category: 'memory',
    title: 'Memory (CLAUDE.md)',
    description: 'CLAUDE.md, @imports, .claude/rules/ for persistent context management',
    topics: [
      'CLAUDE.md file purpose and location',
      'Memory hierarchy (managed > user > project)',
      '@import syntax for file inclusion',
      'CLAUDE.local.md for personal settings',
      '.claude/rules/ directory structure',
      'YAML frontmatter for path-specific rules',
      'Memory file best practices',
      'Content organization and formatting',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/memory',
    targetQuestionCount: 15,
  },
  {
    category: 'skills',
    title: 'Skills',
    description: 'Skill creation, frontmatter settings, dynamic context injection',
    topics: [
      'Skill file structure and location',
      'YAML frontmatter configuration',
      'Skill invocation with /skill-name',
      'Dynamic context injection',
      'Skill permissions and capabilities',
      'Skill arguments and parameters',
      'Integration with other features',
      'Skill debugging and testing',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/skills',
    targetQuestionCount: 15,
  },
  {
    category: 'tools',
    title: 'Tools',
    description: 'Read/Write/Edit/Bash/Glob/Grep and other built-in tools',
    topics: [
      'Read tool for file viewing',
      'Write tool for file creation',
      'Edit tool for file modifications',
      'Bash tool for command execution',
      'Glob tool for file pattern matching',
      'Grep tool for content searching',
      'Tool safety and permissions',
      'Tool output handling',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/tools',
    targetQuestionCount: 15,
  },
  {
    category: 'commands',
    title: 'Commands',
    description: '/context, /compact, /init, !prefix and other command operations',
    topics: [
      '/init command for CLAUDE.md setup',
      '/context and /add-context commands',
      '/compact for conversation summarization',
      '/clear for context clearing',
      '/help for command reference',
      '! prefix for shell commands',
      'Slash command syntax',
      'Command history and recall',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/commands',
    targetQuestionCount: 15,
  },
  {
    category: 'extensions',
    title: 'Extensions',
    description: 'MCP, Hooks, Subagents, Plugins for extensibility',
    topics: [
      'MCP (Model Context Protocol) overview',
      'MCP server configuration',
      'Hooks system for event handling',
      'Pre and post hooks',
      'Subagent spawning and management',
      'Plugin architecture',
      'Custom tool development',
      'Extension debugging',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/extensions',
    targetQuestionCount: 15,
  },
  {
    category: 'session',
    title: 'Session & Context',
    description: 'Session management, context window, fork operations',
    topics: [
      'Session initialization',
      'Context window management',
      'Token usage and limits',
      '/fork command for session branching',
      'Session persistence',
      'Context summarization',
      'Multi-session workflows',
      'Session recovery',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/session',
    targetQuestionCount: 10,
  },
  {
    category: 'keyboard',
    title: 'Keyboard & UI',
    description: 'Shortcuts, Vim mode, UI operations',
    topics: [
      'Essential keyboard shortcuts',
      'Vim mode activation and usage',
      'Navigation shortcuts',
      'Text editing shortcuts',
      'UI customization options',
      'Terminal integration',
      'Visual feedback indicators',
      'Accessibility features',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/keyboard',
    targetQuestionCount: 10,
  },
  {
    category: 'bestpractices',
    title: 'Best Practices',
    description: 'Effective usage, prompt design, workflows',
    topics: [
      'Effective prompt writing',
      'Project organization',
      'Workflow optimization',
      'Error handling strategies',
      'Code review with Claude',
      'Testing approaches',
      'Documentation generation',
      'Security considerations',
    ],
    referenceUrl: 'https://docs.anthropic.com/en/docs/claude-code/best-practices',
    targetQuestionCount: 5,
  },
]

function generateQuizTemplate(
  section: DocumentSection,
  topicIndex: number,
  questionIndex: number
): QuizTemplate {
  const topic = section.topics[topicIndex % section.topics.length]
  const difficulty = questionIndex < 5 ? 'beginner' : questionIndex < 10 ? 'intermediate' : 'advanced'

  return {
    id: `${section.category.substring(0, 3)}-${String(questionIndex + 1).padStart(3, '0')}`,
    category: section.category,
    difficulty,
    question: `[${topic}に関する問題をここに記述]`,
    options: [
      { text: '[正解の選択肢]' },
      { text: '[不正解の選択肢1]', wrongFeedback: '[なぜ間違いかの説明]' },
      { text: '[不正解の選択肢2]', wrongFeedback: '[なぜ間違いかの説明]' },
      { text: '[不正解の選択肢3]', wrongFeedback: '[なぜ間違いかの説明]' },
    ],
    correctIndex: 0,
    explanation: `[${topic}についての詳細な解説をここに記述]`,
    referenceUrl: section.referenceUrl,
    tags: [topic.toLowerCase().replace(/\s+/g, '-')],
  }
}

function generateAIPrompt(section: DocumentSection): string {
  return `
## ${section.title} - Quiz Generation Prompt

Please generate ${section.targetQuestionCount} quiz questions about Claude Code's "${section.title}" feature.

### Category: ${section.category}
### Description: ${section.description}
### Reference: ${section.referenceUrl}

### Topics to Cover:
${section.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

### Requirements:
1. Create questions at three difficulty levels:
   - Beginner (基礎): 40% - Basic concepts and common usage
   - Intermediate (中級): 40% - Advanced usage and edge cases
   - Advanced (上級): 20% - Expert knowledge and integration

2. Each question should have:
   - Clear, unambiguous question text in Japanese
   - 4 answer options (1 correct, 3 incorrect)
   - wrongFeedback for each incorrect option explaining why it's wrong
   - Detailed explanation for the correct answer
   - Reference URL to documentation

3. Question types to include:
   - "Which is the correct...?" (正しいものはどれ？)
   - "What happens when...?" (〜した場合どうなる？)
   - "What is the purpose of...?" (〜の目的は？)
   - "Which command/syntax...?" (〜のコマンド/構文は？)

### Output Format:
Return as a JSON array matching the QuizItem schema:
\`\`\`json
[
  {
    "id": "${section.category.substring(0, 3)}-001",
    "category": "${section.category}",
    "difficulty": "beginner",
    "question": "問題文",
    "options": [
      { "text": "選択肢1" },
      { "text": "選択肢2", "wrongFeedback": "不正解の理由" },
      ...
    ],
    "correctIndex": 0,
    "explanation": "解説",
    "referenceUrl": "${section.referenceUrl}"
  }
]
\`\`\`
`
}

function main() {
  console.log('Claude Code Quiz Generator\n')
  console.log('='.repeat(50))

  // Generate templates
  const templates: QuizTemplate[] = []

  for (const section of DOCUMENTATION_SECTIONS) {
    console.log(`\nGenerating templates for: ${section.title}`)
    console.log(`  Topics: ${section.topics.length}`)
    console.log(`  Target questions: ${section.targetQuestionCount}`)

    for (let i = 0; i < section.targetQuestionCount; i++) {
      templates.push(generateQuizTemplate(section, i, i))
    }
  }

  // Output template JSON
  const templateOutput = {
    title: 'Claude Code Master Quiz',
    version: '2.0.0',
    description: 'Generated quiz templates for Claude Code mastery',
    generatedAt: new Date().toISOString(),
    quizzes: templates,
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n📝 Quiz Templates Generated:')
  console.log(`   Total questions: ${templates.length}`)
  console.log('\n📋 AI Generation Prompts:')
  console.log('-'.repeat(50))

  // Output AI prompts
  for (const section of DOCUMENTATION_SECTIONS) {
    console.log(generateAIPrompt(section))
    console.log('-'.repeat(50))
  }

  // Summary
  console.log('\n📊 Summary by Category:')
  const categoryCounts: Record<string, number> = {}
  for (const template of templates) {
    categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1
  }
  for (const [category, count] of Object.entries(categoryCounts)) {
    console.log(`   ${category}: ${count} questions`)
  }

  console.log('\n✅ Generation complete!')
  console.log('\nNext steps:')
  console.log('1. Use the AI prompts above to generate actual questions')
  console.log('2. Review and refine generated questions')
  console.log('3. Add questions to src/data/quizzes.json')

  // Return the template for programmatic use
  return templateOutput
}

// Export for programmatic use
export { generateQuizTemplate, generateAIPrompt, DOCUMENTATION_SECTIONS }

// Run if called directly
if (require.main === module) {
  main()
}
