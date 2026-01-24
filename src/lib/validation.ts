import { QuizFileSchema, type ValidationResult } from '@/types/quiz'

/**
 * Validates and parses quiz JSON data using Zod schema
 * Provides detailed error messages for debugging
 */
export function validateQuizData(jsonString: string): ValidationResult {
  try {
    // Parse JSON first
    const parsed = JSON.parse(jsonString)

    // Handle both array format and object format
    const dataToValidate = Array.isArray(parsed)
      ? { quizzes: parsed }
      : parsed

    // Validate against schema
    const result = QuizFileSchema.safeParse(dataToValidate)

    if (result.success) {
      return {
        success: true,
        data: result.data,
      }
    }

    // Extract readable error messages
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })

    return {
      success: false,
      errors,
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        errors: ['Invalid JSON format: ' + error.message],
      }
    }
    return {
      success: false,
      errors: ['Unknown validation error'],
    }
  }
}

/**
 * Generate AI prompt with context from user's wrong answer
 */
export function generateAIPrompt(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  basePrompt?: string
): string {
  const contextPrompt = `私はClaude Codeについて学習中です。以下のクイズで誤答しました：

【問題】
${question}

【私の回答】
${userAnswer}

【正解】
${correctAnswer}

${basePrompt || 'なぜ私の回答が誤りで、正解がなぜ正しいのか、具体的な例を交えて詳しく解説してください。'}
`
  return contextPrompt.trim()
}
