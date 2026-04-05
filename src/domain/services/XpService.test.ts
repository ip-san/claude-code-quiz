import { describe, expect, it } from 'vitest'
import { XpService } from './XpService'

describe('XpService', () => {
  describe('calculateAnswerXp', () => {
    it('gives 10 XP for correct answer', () => {
      expect(XpService.calculateAnswerXp(true, false)).toBe(10)
    })

    it('gives 2 XP for incorrect answer', () => {
      expect(XpService.calculateAnswerXp(false, false)).toBe(2)
    })

    it('gives 15 XP for correct SRS review', () => {
      expect(XpService.calculateAnswerXp(true, true)).toBe(15)
    })

    it('gives 2 XP for incorrect SRS review (no bonus)', () => {
      expect(XpService.calculateAnswerXp(false, true)).toBe(2)
    })
  })

  describe('getScenarioCompleteXp', () => {
    it('returns 50', () => {
      expect(XpService.getScenarioCompleteXp()).toBe(50)
    })
  })

  describe('getLevel', () => {
    it('returns level 1 at 0 XP', () => {
      expect(XpService.getLevel(0).level).toBe(1)
    })

    it('returns level 2 at 50 XP', () => {
      expect(XpService.getLevel(50).level).toBe(2)
    })

    it('returns level 3 at 150 XP', () => {
      expect(XpService.getLevel(150).level).toBe(3)
    })

    it('stays at level 1 at 49 XP', () => {
      expect(XpService.getLevel(49).level).toBe(1)
    })

    it('returns max level at 3000+ XP', () => {
      expect(XpService.getLevel(5000).level).toBe(7)
    })
  })

  describe('getProgressToNextLevel', () => {
    it('returns 0% at level start', () => {
      expect(XpService.getProgressToNextLevel(0).percentage).toBe(0)
    })

    it('returns 50% at midpoint', () => {
      // Level 1: 0-49 (range 50), midpoint = 25
      expect(XpService.getProgressToNextLevel(25).percentage).toBe(50)
    })

    it('returns 100% at max level', () => {
      expect(XpService.getProgressToNextLevel(3000).percentage).toBe(100)
    })
  })

  describe('checkLevelUp', () => {
    it('detects level up', () => {
      const result = XpService.checkLevelUp(40, 60)
      expect(result).not.toBeNull()
      expect(result!.level).toBe(2)
    })

    it('returns null when no level up', () => {
      expect(XpService.checkLevelUp(10, 20)).toBeNull()
    })

    it('returns null when XP decreased', () => {
      expect(XpService.checkLevelUp(60, 40)).toBeNull()
    })
  })
})
