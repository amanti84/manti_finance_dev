/**
 * usePayslips.ts
 * Hook React per gestione cedolini - Payroll Engine v1
 * Issue #8 - M2 Core Modules
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  getPayslipsByYear,
  createPayslip,
  updatePayslip,
  deletePayslip,
  calculateNetTrend,
} from '../services/payroll'
import type { Payslip } from '../types'

interface UsePayslipsState {
  payslips: Payslip[]
  loading: boolean
  error: string | null
}

interface UsePayslipsReturn extends UsePayslipsState {
  trend: ReturnType<typeof calculateNetTrend>
  addPayslip: (data: Omit<Payslip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>
  editPayslip: (id: string, updates: Partial<Omit<Payslip, 'id' | 'createdAt'>>) => Promise<boolean>
  removePayslip: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function usePayslips(year: number): UsePayslipsReturn {
  const { user } = useAuth()
  const [state, setState] = useState<UsePayslipsState>({
    payslips: [],
    loading: true,
    error: null,
  })

  const fetchPayslips = useCallback(async () => {
    if (!user?.uid) {
      setState({ payslips: [], loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    const result = await getPayslipsByYear(user.uid, year)
    if (result.error) {
      setState({ payslips: [], loading: false, error: result.error })
    } else {
      setState({ payslips: result.data ?? [], loading: false, error: null })
    }
  }, [user?.uid, year])

  useEffect(() => {
    void fetchPayslips()
  }, [fetchPayslips])

  const addPayslip = useCallback(
    async (data: Omit<Payslip, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
      if (!user?.uid) return null
      const result = await createPayslip(user.uid, data)
      if (!result.error) {
        void fetchPayslips()
        return result.data
      }
      return null
    },
    [user?.uid, fetchPayslips]
  )

  const editPayslip = useCallback(
    async (id: string, updates: Partial<Omit<Payslip, 'id' | 'createdAt'>>): Promise<boolean> => {
      if (!user?.uid) return false
      const result = await updatePayslip(user.uid, id, updates)
      if (!result.error) {
        void fetchPayslips()
        return true
      }
      return false
    },
    [user?.uid, fetchPayslips]
  )

  const removePayslip = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.uid) return false
      const result = await deletePayslip(user.uid, id)
      if (!result.error) {
        void fetchPayslips()
        return true
      }
      return false
    },
    [user?.uid, fetchPayslips]
  )

  return {
    ...state,
    trend: calculateNetTrend(state.payslips),
    addPayslip,
    editPayslip,
    removePayslip,
    refresh: fetchPayslips,
  }
}
