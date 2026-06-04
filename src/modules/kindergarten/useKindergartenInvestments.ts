/**
 * Hook: useKindergartenInvestments
 * Gestisce SOLO gli investimenti diretti del portafoglio bambini.
 * Collection: users/{uid}/kindergarten_investments
 */
import { useState, useEffect, useCallback } from 'react'
import type { KindergartenInvestment } from '../../types/kindergarten'
import {
  getKindergartenInvestments,
  addKindergartenInvestment,
  updateKindergartenInvestment,
  deleteKindergartenInvestment,
  calculateKindergartenInvestmentKPIs,
} from '../../services/kindergartenInvestment'

export function useKindergartenInvestments(uid: string) {
  const [investments, setInvestments] = useState<KindergartenInvestment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvestments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getKindergartenInvestments(uid)
      if (res.success) {
        setInvestments(res.data)
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento investimenti')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void fetchInvestments()
  }, [fetchInvestments])

  const addInvestment = async (
    investment: Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const res = await addKindergartenInvestment(uid, investment)
    if (res.success) await fetchInvestments()
    return res
  }

  const updateInvestment = async (
    id: string,
    data: Partial<Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const res = await updateKindergartenInvestment(uid, id, data)
    if (res.success) await fetchInvestments()
    return res
  }

  const deleteInvestment = async (id: string) => {
    const res = await deleteKindergartenInvestment(uid, id)
    if (res.success) await fetchInvestments()
    return res
  }

  const kpis = calculateKindergartenInvestmentKPIs(investments)

  return {
    investments,
    kpis,
    loading,
    error,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    refresh: fetchInvestments,
  }
}
