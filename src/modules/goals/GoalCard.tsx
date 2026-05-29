import React from 'react'
import type { Goal, GoalStatus } from '../../types'
import { calculateGoalProgress } from '../../services/goal'

interface GoalCardProps {
  goal: Goal
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: GoalStatus) => void
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onDelete, onStatusChange }) => {
  const progress = calculateGoalProgress(goal)

  const getStatusBadge = (status: GoalStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded">Attivo</span>
      case 'completed':
        return <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded">Completato</span>
      case 'paused':
        return <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded">In pausa</span>
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    return type.replace('_', ' ')
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
            {getTypeLabel(goal.type)}
          </p>
          <h3 className="text-lg font-bold text-gray-900">{goal.name}</h3>
        </div>
        {getStatusBadge(goal.status)}
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-2xl font-bold text-gray-900">
            € {goal.currentAmount.toLocaleString('it-IT')}
          </span>
          <span className="text-sm text-gray-500">
            di € {goal.targetAmount.toLocaleString('it-IT')}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              goal.status === 'completed' ? 'bg-blue-600' : 'bg-green-500'
            }`}
            style={{ width: `${progress.progressPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs font-bold text-gray-700">{progress.progressPercent}%</span>
          {progress.milestoneReached && progress.milestoneReached > 0 && (
            <span className="text-xs font-bold text-blue-600">🎯 {progress.milestoneReached}% raggiunto!</span>
          )}
        </div>
      </div>

      <div className="flex-grow space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Data Target:</span>
          <span className="font-medium">{goal.targetDate.toDate().toLocaleDateString('it-IT')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Proiezione:</span>
          <span className={`font-medium ${progress.isOnTrack ? 'text-green-600' : 'text-orange-600'}`}>
            {progress.projectedCompletionDate
              ? progress.projectedCompletionDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
              : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Stato:</span>
          <span className={`font-bold ${progress.isOnTrack ? 'text-green-600' : 'text-orange-600'}`}>
            {progress.isOnTrack ? '✓ In linea' : '⚠ A rischio'}
          </span>
        </div>
        {goal.note && (
          <p className="text-xs text-gray-500 italic mt-2 border-t pt-2">{goal.note}</p>
        )}
      </div>

      <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
        <select
          value={goal.status}
          onChange={(e) => onStatusChange(goal.id, e.target.value as GoalStatus)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-gray-50"
        >
          <option value="active">Attivo</option>
          <option value="paused">In pausa</option>
          <option value="completed">Completato</option>
        </select>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Elimina
        </button>
      </div>
    </div>
  )
}
