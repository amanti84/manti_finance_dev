import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { listGoals, deleteGoal, updateGoalStatus } from '../../services/goal'
import type { Goal, GoalStatus } from '../../types'
import { GoalCard } from './GoalCard'
import { GoalForm } from './GoalForm'

export const GoalsPage: React.FC = () => {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchGoals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const result = await listGoals(user.uid)
    if (result.success) {
      setGoals(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void fetchGoals()
  }, [fetchGoals])

  const handleDelete = async (goalId: string) => {
    if (!user || !window.confirm('Sei sicuro di voler eliminare questo obiettivo?')) return
    const result = await deleteGoal(user.uid, goalId)
    if (result.success) {
      void fetchGoals()
    } else {
      alert('Errore durante l\'eliminazione: ' + result.error)
    }
  }

  const handleStatusChange = async (goalId: string, status: GoalStatus) => {
    if (!user) return
    const result = await updateGoalStatus(user.uid, goalId, status)
    if (result.success) {
      void fetchGoals()
    } else {
      alert('Errore durante l\'aggiornamento dello stato: ' + result.error)
    }
  }

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')
  const pausedGoals = goals.filter((g) => g.status === 'paused')

  if (loading && goals.length === 0) {
    return <div className="p-6">Caricamento obiettivi...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Obiettivi Finanziari</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Annulla' : '+ Nuovo obiettivo'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4">Crea nuovo obiettivo</h2>
          <GoalForm
            onSuccess={() => {
              setShowForm(false)
              void fetchGoals()
            }}
          />
        </div>
      )}

      {goals.length === 0 && !loading ? (
        <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-4">Nessun obiettivo definito. Crea il tuo primo goal finanziario.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-600 font-semibold hover:underline"
          >
            Inizia ora &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeGoals.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Attivi ({activeGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={(id) => {
                      void handleDelete(id)
                    }}
                    onStatusChange={(id, status) => {
                      void handleStatusChange(id, status)
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {pausedGoals.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                In pausa ({pausedGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pausedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={(id) => {
                      void handleDelete(id)
                    }}
                    onStatusChange={(id, status) => {
                      void handleStatusChange(id, status)
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {completedGoals.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Completati ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={(id) => {
                      void handleDelete(id)
                    }}
                    onStatusChange={(id, status) => {
                      void handleStatusChange(id, status)
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
