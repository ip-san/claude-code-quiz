import { describe, expect, it } from 'vitest'
import { SCENARIOS } from './scenarios'

describe('Scenarios', () => {
  it('all scenarios have at least one question', () => {
    for (const scenario of SCENARIOS) {
      const questions = scenario.steps.filter((s) => s.type === 'question')
      expect(questions.length, `${scenario.id} has no questions`).toBeGreaterThan(0)
    }
  })

  it('all question steps have valid questionId', () => {
    for (const scenario of SCENARIOS) {
      const questionSteps = scenario.steps.filter((s) => s.type === 'question')
      for (const step of questionSteps) {
        expect(step.questionId, `${scenario.id} has question step without questionId`).toBeTruthy()
      }
    }
  })

  it('all scenarios have an epilogue (narrative after last question)', () => {
    for (const scenario of SCENARIOS) {
      const lastStep = scenario.steps[scenario.steps.length - 1]
      expect(
        lastStep.type,
        `${scenario.id} missing epilogue: last step is '${lastStep.type}', expected 'narrative'`
      ).toBe('narrative')
      expect(lastStep.text, `${scenario.id} epilogue has no text`).toBeTruthy()
    }
  })

  it('all scenarios have a completionMessage', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.completionMessage, `${scenario.id} missing completionMessage`).toBeTruthy()
    }
  })

  it('all scenarios start with a narrative', () => {
    for (const scenario of SCENARIOS) {
      const firstStep = scenario.steps[0]
      expect(firstStep.type, `${scenario.id}: first step should be narrative, got '${firstStep.type}'`).toBe(
        'narrative'
      )
    }
  })

  it('narrative steps always have text', () => {
    for (const scenario of SCENARIOS) {
      const narrativeSteps = scenario.steps.filter((s) => s.type === 'narrative')
      for (const step of narrativeSteps) {
        expect(step.text, `${scenario.id} has narrative step without text`).toBeTruthy()
      }
    }
  })
})

describe('narrativeMap building logic', () => {
  /**
   * Replicates the narrativeMap logic from ScenarioView to test it in isolation.
   * If ScenarioView's logic changes, this test should be updated to match.
   */
  function buildNarrativeMap(steps: readonly { type: string; text?: string }[]) {
    const map: Record<number, string[]> = {}
    let qIdx = 0
    let pending: string[] = []

    for (const step of steps) {
      if (step.type === 'narrative' && step.text) {
        pending.push(step.text)
      } else if (step.type === 'question') {
        if (pending.length > 0) {
          map[qIdx] = [...pending]
          pending = []
        }
        qIdx++
      }
    }
    if (pending.length > 0) {
      map[qIdx] = [...pending]
    }
    return { map, questionCount: qIdx }
  }

  it('captures epilogue at questionCount index', () => {
    const steps = [{ type: 'narrative', text: 'intro' }, { type: 'question' }, { type: 'narrative', text: 'epilogue' }]
    const { map, questionCount } = buildNarrativeMap(steps)
    expect(questionCount).toBe(1)
    expect(map[0]).toEqual(['intro'])
    expect(map[questionCount]).toEqual(['epilogue'])
  })

  it('handles multiple narratives before a question', () => {
    const steps = [{ type: 'narrative', text: 'page1' }, { type: 'narrative', text: 'page2' }, { type: 'question' }]
    const { map } = buildNarrativeMap(steps)
    expect(map[0]).toEqual(['page1', 'page2'])
  })

  it('handles no epilogue', () => {
    const steps = [{ type: 'narrative', text: 'intro' }, { type: 'question' }]
    const { map, questionCount } = buildNarrativeMap(steps)
    expect(map[questionCount]).toBeUndefined()
  })

  it('epilogue index equals questionCount for all real scenarios', () => {
    for (const scenario of SCENARIOS) {
      const { map, questionCount } = buildNarrativeMap(scenario.steps)
      expect(map[questionCount], `${scenario.id}: epilogue should be at index ${questionCount}`).toBeTruthy()
      expect(map[questionCount].length, `${scenario.id}: epilogue should have at least 1 text`).toBeGreaterThan(0)
    }
  })
})
