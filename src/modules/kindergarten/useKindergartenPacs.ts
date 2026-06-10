/**
 * Hook: useKindergartenPacs
 * Gestisce SOLO i PAC del portafoglio bambini.
 * Collection: users/{uid}/kindergarten_pacs
 * Al mount esegue auto-payment check.
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
import {
  processKGPACAutoPayments,
  type AutoPaymentResult,
} from '../../services/kindergartenPacPayments'

export interface UseKindergartenPacsReturn {
  pacs: KindergartenPAC[]
  kpis: ReturnType<typeof calculateKindergartenPACKPIs>
  loading: boolean
  error: string | null
  autoPaymentResults: AutoPaymentResult[]
  addPAC: (pac: Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  updatePAC: (id: string, data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<unknown>
  deletePAC: (id: string) => Promise<unknown>
  refresh: () => Promise<void>
  clearAutoPaymentResults: () => void
}

export function useKindergartenPacs(uid: string): UseKindergartenPacsReturn {
  const [pacs, setPacs] = useState<KindergartenPAC[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoPaymentResults, setAutoPaymentResults] = useState<AutoPaymentResult[]>([])

  const updatePAC = useCallback(async (
    id: string,
    data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    return updateKindergartenPAC(uid, id, data)
  }, [uid])

  const fetchPACs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getKindergartenPACs(uid)
      if (res.success) {
        setPacs(res.data)
        // Auto-payment check dopo il fetch
        const results = await processKGPACAutoPayments(uid, res.data, updatePAC)
        if (results.length > 0) {
          setAutoPaymentResults(results)
          // Ri-fetch per aggiornare totalInvested e nextPaymentDate
          const refreshed = await getKindergartenPACs(uid)
          if (refreshed.success) setPacs(refreshed.data)
        }
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento PAC')
    } finally {
      setLoading(false)
    }
  }, [uid, updatePAC])

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

  const updatePACAndRefresh = async (
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
    autoPaymentResults,
    addPAC,
    updatePAC: updatePACAndRefresh,
    deletePAC,
    refresh: fetchPACs,
    clearAutoPaymentResults: () => setAutoPaymentResults([]),
  }
}
