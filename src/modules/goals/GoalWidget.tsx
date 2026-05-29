import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listGoals, calculateGoalProgress } from '../../services/goal'
import type { Goal, GoalProgress } from '../../types'

interface GoalWithProgress extends Goal {
  progress: GoalProgress
}

interface GoalWidgetProps {
  uid: string
}

export const GoalWidget: React.FC<GoalWidgetProps> = ({ uid }) => {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const result = await listGoals(uid)
      if (result.success) {
        // Mostra max 3 goal con status active, ordinati per progressPercent DESC
        const activeGoals = result.data
          .filter((g) => g.status === 'active')
          .map((g) => ({ ...g, progress: calculateGoalProgress(g) }))
          .sort((a, b) => b.progress.progressPercent - a.progress.progressPercent)
          .slice(0, 3)
        setGoals(activeGoals)
      }
      setLoading(false)
    }
    void fetch()
  }, [uid])

  if (loading) return <p className="text-sm text-gray-500 italic mt-2">Caricamento obiettivi...</p>

  if (goals.length === 0) {
    return (
      <div className="mt-4">
        <p className="text-sm text-gray-500 italic">Nessun obiettivo attivo.</p>
        <Link to="/goals" className="text-blue-600 text-sm hover:underline mt-1 block">
          Crea un goal &rarr;
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      {goals.map((goal) => (
        <div key={goal.id}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700 truncate mr-2">{goal.name}</span>
            <span className="text-xs font-bold text-gray-900">{goal.progress.progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${goal.progress.progressPercent}%` }}
            ></div>
          </div>
        </div>
      ))}
      <div className="pt-2">
        <Link to="/goals" className="text-blue-600 text-sm font-medium hover:underline">
          Vedi tutti gli obiettivi &rarr;
        </Link>
      </div>
    </div>
  )
}
