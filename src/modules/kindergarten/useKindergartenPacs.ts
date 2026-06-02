/**
 * Hook: useKindergartenPacs
 * Gestisce SOLO i PAC del portafoglio bambini.
 * Collection: users/{uid}/kindergarten_pacs
 */
import { useState, useEffect, useCallback } from 'react'
import type { KindergartenPAC } from '../../types/kindergarten'
import {
  getKindergartenPACs,
  addKindergartenPAC,
  updateKindergartenPAC,
  deleteKindergartenPAC,
  calculateKindergartenPACKPIs,
} from '../../services/kindergartenPac'

export function useKindergartenPacs(uid: string) {
  const [pacs, setPacs] = useState<KindergartenPAC[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPACs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getKindergartenPACs(uid)
      if (res.success) {
        setPacs(res.data)
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento PAC')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void fetchPACs()
  }, [fetchPACs])

  const addPAC = async (
    pac: Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const res = await addKindergartenPAC(uid, pac)
    if (res.success) await fetchPACs()
    return res
  }

  const updatePAC = async (
    id: string,
    data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const res = await updateKindergartenPAC(uid, id, data)
    if (res.success) await fetchPACs()
    return res
  }

  const deletePAC = async (id: string) => {
    const res = await deleteKindergartenPAC(uid, id)
    if (res.success) await fetchPACs()
    return res
  }

  const kpis = calculateKindergartenPACKPIs(pacs)

  return {
    pacs,
    kpis,
    loading,
    error,
    addPAC,
    updatePAC,
    deletePAC,
    refresh: fetchPACs,
  }
}
