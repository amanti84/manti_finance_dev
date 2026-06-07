import { useState, type FC } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { formatCurrency } from '../utils/format'

const SEED_FUNCTION_URL = 'https://us-central1-mantifinance.cloudfunctions.net/seeduserdata'

interface MigrationCollectionResult {
  inserted: number
  skipped: number
  errors: string[]
}

interface MigrationResult {
  pacs: MigrationCollectionResult
  investments: MigrationCollectionResult
  kindergartenPacs: MigrationCollectionResult
  kindergartenTransactions: MigrationCollectionResult
  transactions: MigrationCollectionResult
  sales: MigrationCollectionResult
  validation: {
    adultTotalInvested_legacy: number
    adultTotalInvested_new: number
    kindergartenTotalInvested_legacy: number
    kindergartenTotalInvested_new: number
    passed: boolean
    mismatchDetails: string[]
  }
}

export const AdminPage: FC = () => {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [seedResult, setSeedResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dryRun, setDryRun] = useState(false)

  // Calcolato ad ogni render per riflettere correttamente i cambiamenti dell'ambiente nei test
  const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS as string || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())

  if (authLoading) {
    return <div className="p-8 text-center">Caricamento...</div>
  }

  if (!user?.email || !allowedEmails.includes(user.email.toLowerCase())) {
    return <Navigate to="/" replace />
  }

  const handleSeedData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    setSeedResult(null)
    setMigrationResult(null)
    try {
      const idToken = await user.getIdToken()

      const response = await fetch(SEED_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json() as { success: boolean; error: string }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json() as { success: boolean; data: { inserted: number; skipped: number } }
      if (data.success) {
        setSeedResult(data.data)
      } else {
        setError('Errore durante il seeding dei dati')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const handleMigration = async (isDryRun: boolean) => {
    setLoading(true)
    setError(null)
    setSeedResult(null)
    setMigrationResult(null)
    setDryRun(isDryRun)

    try {
      const migrateFn = httpsCallable<{ dryRun: boolean }, { success: boolean; data: MigrationResult }>(
        functions,
        'migrateFromLegacy'
      )
      const result = await migrateFn({ dryRun: isDryRun })

      if (result.data.success) {
        setMigrationResult(result.data.data)
      } else {
        setError('Errore durante la migrazione')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la chiamata alla funzione di migrazione')
    } finally {
      setLoading(false)
    }
  }

  const allErrors = migrationResult
    ? [
        ...migrationResult.pacs.errors,
        ...migrationResult.investments.errors,
        ...migrationResult.kindergartenPacs.errors,
        ...migrationResult.kindergartenTransactions.errors,
        ...migrationResult.transactions.errors,
        ...migrationResult.sales.errors,
      ]
    : []

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold mb-6">Pannello Amministrazione</h1>

      {/* SEED DATA SECTION */}
      <Card className="p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Seed Data</h2>
        <p className="text-gray-600 mb-6">
          Carica i dati reali di PAC e Investimenti per test e sviluppo.
          L&apos;operazione è idempotente (non crea duplicati).
        </p>
        {seedResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded mb-6">
            <p className="font-semibold">Dati caricati correttamente:</p>
            <p>Inseriti: {seedResult.inserted}</p>
            <p>Saltati (duplicati): {seedResult.skipped}</p>
          </div>
        )}
        <Button
          onClick={() => { void handleSeedData() }}
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading && !migrationResult ? 'Caricamento in corso...' : 'Carica dati seed'}
        </Button>
      </Card>

      {/* MIGRATION SECTION */}
      <Card className="p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">🔄 Migrazione da manti-finance</h2>
        <p className="text-gray-600 mb-6">
          Importa PAC, Investimenti e Kindergarten dalla piattaforma precedente.
          L&apos;operazione è idempotente (no duplicati).
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Button
            variant="secondary"
            onClick={() => { void handleMigration(true) }}
            disabled={loading}
            className="flex-1"
          >
            {loading && dryRun ? 'Simulazione...' : 'Prova a vuoto (dry run)'}
          </Button>
          <Button
            onClick={() => { void handleMigration(false) }}
            disabled={loading}
            className="flex-1"
          >
            {loading && !dryRun && migrationResult === null ? 'Migrazione in corso...' : 'Avvia migrazione'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded mb-6 whitespace-pre-wrap">
            <p className="font-bold">Errore:</p>
            <p>{error}</p>
          </div>
        )}

        {migrationResult && (
          <div className={`p-4 rounded border ${
            migrationResult.validation.passed
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <h3 className="font-bold mb-2">
              {dryRun ? 'Report Simulazione (Dry Run)' : 'Report Migrazione'}
              {migrationResult.validation.passed ? ' ✅' : ' ⚠️'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <div className="space-y-1">
                <p className="font-semibold border-b border-current/20 pb-1">Portafoglio Adulti</p>
                <p>PAC: +{migrationResult.pacs.inserted} (skip: {migrationResult.pacs.skipped})</p>
                <p>Investimenti: +{migrationResult.investments.inserted} (skip: {migrationResult.investments.skipped})</p>
                <p>Transazioni: +{migrationResult.transactions.inserted} (skip: {migrationResult.transactions.skipped})</p>
                <p>Vendite: +{migrationResult.sales.inserted} (skip: {migrationResult.sales.skipped})</p>
                <p className="pt-1">Legacy: {formatCurrency(migrationResult.validation.adultTotalInvested_legacy)}</p>
                <p>Nuovo: {formatCurrency(migrationResult.validation.adultTotalInvested_new)}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold border-b border-current/20 pb-1">Kindergarten</p>
                <p>PAC: +{migrationResult.kindergartenPacs.inserted} (skip: {migrationResult.kindergartenPacs.skipped})</p>
                <p>Transazioni: +{migrationResult.kindergartenTransactions.inserted} (skip: {migrationResult.kindergartenTransactions.skipped})</p>
                <p className="pt-1">Legacy: {formatCurrency(migrationResult.validation.kindergartenTotalInvested_legacy)}</p>
                <p>Nuovo: {formatCurrency(migrationResult.validation.kindergartenTotalInvested_new)}</p>
              </div>
            </div>

            {!migrationResult.validation.passed && migrationResult.validation.mismatchDetails.length > 0 && (
              <div className="text-xs bg-red-100 p-2 rounded text-red-700 mt-2">
                <p className="font-bold">Dettagli Mismatch:</p>
                {migrationResult.validation.mismatchDetails.map((d, i) => <p key={i}>{d}</p>)}
              </div>
            )}

            {allErrors.length > 0 && (
              <div className="text-xs bg-red-100 p-2 rounded text-red-700 mt-2">
                <p className="font-bold">Errori parziali:</p>
                {allErrors.slice(0, 5).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                {allErrors.length > 5 && <p>...e altri {allErrors.length - 5}</p>}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default AdminPage
