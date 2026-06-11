/**
 * useInvestments.ts
 * Hook React per gestione investimenti - Core Module
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  getAllInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getPortfolioSummary,
  type PortfolioSummary
} from '../services/investment'
import { withRetry } from '../utils/withRetry'
import type { Investment, ApiResult } from '../types'

export interface UseInvestmentsReturn {
  investments: Investment[]
  loading: boolean
  error: string | null
  summary: PortfolioSummary | null
  addInvestment: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>) => Promise<ApiResult<string>>
  editInvestment: (id: string, data: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<ApiResult<void>>
  removeInvestment: (id: string) => Promise<ApiResult<void>>
  refresh: () => Promise<void>
}

export function useInvestments(): UseInvestmentsReturn {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvestments = useCallback(async () => {
    if (!user?.uid) {
      setInvestments([])
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await withRetry(() => getAllInvestments(user.uid))
    if (result.success) {
      setInvestments(result.data ?? [])
      setError(null)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [user?.uid])

  useEffect(() => {
    void fetchInvestments()
  }, [fetchInvestments])

  const summary = useMemo(() => {
    if (investments.length === 0) return null
    const res = getPortfolioSummary(investments)
    return res.success ? res.data : null
  }, [investments])

  const addInvestment = async (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>) => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<string>
    const result = await createInvestment(user.uid, data)
    if (result.success) {
      await fetchInvestments()
    }
    return result
  }

  const editInvestment = async (id: string, data: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<void>
    const result = await updateInvestment(user.uid, id, data)
    if (result.success) {
      await fetchInvestments()
    }
    return result
  }

  const removeInvestment = async (id: string) => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<void>
    const result = await deleteInvestment(user.uid, id)
    if (result.success) {
      await fetchInvestments()
    }
    return result
  }

  return {
    investments,
    loading,
    error,
    summary,
    addInvestment,
    editInvestment,
    removeInvestment,
    refresh: fetchInvestments
  }
}
