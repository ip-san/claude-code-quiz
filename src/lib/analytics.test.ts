import { describe, expect, it } from 'vitest'
import { ErrorRateLimiter } from './analytics'

describe('ErrorRateLimiter', () => {
  it('allows up to maxCount calls for the same key within the window', () => {
    const limiter = new ErrorRateLimiter(3, 10_000)
    const now = 1000

    expect(limiter.allow('err-a', now)).toBe(true)
    expect(limiter.allow('err-a', now + 1)).toBe(true)
    expect(limiter.allow('err-a', now + 2)).toBe(true)
    expect(limiter.allow('err-a', now + 3)).toBe(false)
    expect(limiter.allow('err-a', now + 4)).toBe(false)
  })

  it('tracks different keys independently', () => {
    const limiter = new ErrorRateLimiter(2, 10_000)
    const now = 1000

    expect(limiter.allow('err-a', now)).toBe(true)
    expect(limiter.allow('err-a', now + 1)).toBe(true)
    expect(limiter.allow('err-a', now + 2)).toBe(false)

    // Different key still allowed
    expect(limiter.allow('err-b', now + 3)).toBe(true)
    expect(limiter.allow('err-b', now + 4)).toBe(true)
    expect(limiter.allow('err-b', now + 5)).toBe(false)
  })

  it('resets after the time window expires', () => {
    const limiter = new ErrorRateLimiter(2, 1000)
    const now = 1000

    expect(limiter.allow('err-a', now)).toBe(true)
    expect(limiter.allow('err-a', now + 1)).toBe(true)
    expect(limiter.allow('err-a', now + 2)).toBe(false)

    // After window expires, allowed again
    expect(limiter.allow('err-a', now + 1001)).toBe(true)
    expect(limiter.allow('err-a', now + 1002)).toBe(true)
    expect(limiter.allow('err-a', now + 1003)).toBe(false)
  })

  it('uses default maxCount=5 and windowMs=60000', () => {
    const limiter = new ErrorRateLimiter()
    const now = 0

    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('err', now + i)).toBe(true)
    }
    expect(limiter.allow('err', now + 5)).toBe(false)

    // Resets after 60s
    expect(limiter.allow('err', now + 60_001)).toBe(true)
  })
})
