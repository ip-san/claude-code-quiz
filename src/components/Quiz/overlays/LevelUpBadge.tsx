import { useEffect, useState } from 'react'
import { type XpLevel, XpService } from '@/domain/services/XpService'

interface LevelUpBadgeProps {
  previousXp: number
  currentXp: number
}

/**
 * レベルアップ時に表示するバッジ
 */
export function LevelUpBadge({ previousXp, currentXp }: LevelUpBadgeProps) {
  const [show, setShow] = useState(false)
  const levelUp = XpService.checkLevelUp(previousXp, currentXp)

  useEffect(() => {
    if (levelUp) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [levelUp])

  if (!show || !levelUp) return null

  return <LevelUpDisplay level={levelUp} />
}

function LevelUpDisplay({ level }: { level: XpLevel }) {
  return (
    <div className="mb-4 animate-bounce-in rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 text-center dark:border-amber-500/30 dark:from-amber-500/10 dark:to-yellow-500/10">
      <p className="text-2xl">{level.icon}</p>
      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Level Up!</p>
      <p className="text-xs text-stone-600 dark:text-stone-400">
        Lv.{level.level} {level.name} に到達しました
      </p>
    </div>
  )
}
