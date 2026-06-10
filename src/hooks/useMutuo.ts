/**
 * useMutuo.ts
 * Hook React per gestione mutuo - Core Module
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  getMutuoConfig,
  saveMutuoConfig,
  updateMutuo,
  deleteMutuo as deleteMutuoService,
  simulateOverpayment,
  applyPartialRepayment as applyPartialRepaymentService,
  getPianoAmmortamento,
  getMutuoSummary,
  updateDebitoResiduo,
  type PianoAmmortamento,
  type MutuoSummary
} from '../services/mutuo'
import type { MutuoConfig, ApiResult, OverpaymentSimulation } from '../types'

export interface UseMutuoReturn {
  config: MutuoConfig | null
  piano: PianoAmmortamento | null
  summary: MutuoSummary | null
  loading: boolean
  error: string | null
  saveConfig: (data: MutuoConfig) => Promise<ApiResult<void>>
  updateMutuo: (data: Partial<MutuoConfig>) => Promise<ApiResult<void>>
  deleteMutuo: () => Promise<ApiResult<void>>
  simulateOverpayment: (extraAmount: number) => ApiResult<OverpaymentSimulation>
  applyPartialRepayment: (amount: number) => Promise<ApiResult<void>>
  updateResidual: (nuovoDebito: number) => Promise<ApiResult<void>>
  refresh: () => Promise<void>
}

export function useMutuo(): UseMutuoReturn {
  const { user } = useAuth()
  const [config, setConfig] = useState<MutuoConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMutuo = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await getMutuoConfig(user.uid)
    if (result.success) {
      setConfig(result.data)
      setError(null)
    } else {
      // Se non trovato, non lo consideriamo un errore bloccante per la UI
      if (result.error !== 'Configurazione mutuo non trovata') {
        setError(result.error)
      }
      setConfig(null)
    }
    setLoading(false)
  }, [user?.uid])

  useEffect(() => {
    void fetchMutuo()
  }, [fetchMutuo])

  const piano = useMemo(() => {
    if (!config) return null
    const res = getPianoAmmortamento(config)
    return res.success ? res.data : null
  }, [config])

  const summary = useMemo(() => {
    if (!config) return null
    const res = getMutuoSummary(config)
    return res.success ? res.data : null
  }, [config])

  const saveConfig = async (data: MutuoConfig) => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<void>
    const result = await saveMutuoConfig(user.uid, data)
    if (result.success) {
      await fetchMutuo()
    }
    return result
  }

  const handleSimulateOverpayment = (extraAmount: number) => {
    if (!config) return { success: false, error: 'Mutuo non configurato' } as ApiResult<OverpaymentSimulation>
    return simulateOverpayment(config, extraAmount)
  }

  const handleUpdateMutuo = async (data: Partial<MutuoConfig>) => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<void>
    const result = await updateMutuo(user.uid, 'config', data)
    if (result.success) {
      await fetchMutuo()
    }
    return result
  }

  const handleDeleteMutuo = async () => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<void>
    const result = await deleteMutuoService(user.uid, 'config')
    if (result.success) {
      await fetchMutuo()
    }
    return result
  }

  const handleApplyPartialRepayment = async (amount: number) => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<void>
    const result = await applyPartialRepaymentService(user.uid, 'config', amount)
    if (result.success) {
      await fetchMutuo()
    }
    return result
  }

  const updateResidual = async (nuovoDebito: number) => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' } as ApiResult<void>
    const result = await updateDebitoResiduo(user.uid, nuovoDebito)
    if (result.success) {
      await fetchMutuo()
    }
    return result
  }

  return {
    config,
    piano,
    summary,
    loading,
    error,
    saveConfig,
    updateMutuo: handleUpdateMutuo,
    deleteMutuo: handleDeleteMutuo,
    simulateOverpayment: handleSimulateOverpayment,
    applyPartialRepayment: handleApplyPartialRepayment,
    updateResidual,
    refresh: fetchMutuo
  }
}
