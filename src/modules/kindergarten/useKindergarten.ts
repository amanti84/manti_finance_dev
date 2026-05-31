import { useState, useEffect, useCallback } from 'react'
import type {
  KindergartenExpense,
  KindergartenConfig,
  KindergartenSummary,
} from '../../types'
import {
  getKindergartenExpenses,
  addKindergartenExpense as addExpenseService,
  updateKindergartenExpense as updateExpenseService,
  deleteKindergartenExpense as deleteExpenseService,
  getKindergartenConfig,
  setKindergartenConfig as setConfigService,
  getKindergartenSummary,
} from '../../services/kindergarten'

export function useKindergarten(uid: string, year: number) {
  const [expenses, setExpenses] = useState<KindergartenExpense[]>([])
  const [config, setConfig] = useState<KindergartenConfig | null>(null)
  const [summary, setSummary] = useState<KindergartenSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [expensesRes, configRes, summaryRes] = await Promise.all([
        getKindergartenExpenses(uid, year),
        getKindergartenConfig(uid),
        getKindergartenSummary(uid, year),
      ])

      if (expensesRes.success) setExpenses(expensesRes.data)
      if (configRes.success) setConfig(configRes.data)
      if (summaryRes.success) setSummary(summaryRes.data)

      if (!expensesRes.success) setError(expensesRes.error)
      else if (!configRes.success) setError(configRes.error)
      else if (!summaryRes.success) setError(summaryRes.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [uid, year])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const addExpense = async (expense: Omit<KindergartenExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await addExpenseService(uid, expense)
    if (res.success) {
      await fetchData()
    }
    return res
  }

  const updateExpense = async (
    id: string,
    data: Partial<Omit<KindergartenExpense, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const res = await updateExpenseService(uid, id, data)
    if (res.success) {
      await fetchData()
    }
    return res
  }

  const deleteExpense = async (id: string) => {
    const res = await deleteExpenseService(uid, id)
    if (res.success) {
      await fetchData()
    }
    return res
  }

  const setKindergartenConfig = async (
    newConfig: Omit<KindergartenConfig, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const res = await setConfigService(uid, newConfig)
    if (res.success) {
      await fetchData()
    }
    return res
  }

  return {
    expenses,
    config,
    summary,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    setConfig: setKindergartenConfig,
    refresh: fetchData,
  }
}
