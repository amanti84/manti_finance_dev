import { useState, type FC } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const SEED_FUNCTION_URL = 'https://us-central1-mantifinance.cloudfunctions.net/seeduserdata'

export const AdminPage: FC = () => {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    setResult(null)
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
        setResult(data.data)
      } else {
        setError('Errore durante il seeding dei dati')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pannello Amministrazione</h1>
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Seed Data</h2>
        <p className="text-gray-600 mb-6">
          Carica i dati reali di PAC e Investimenti per test e sviluppo.
          L&apos;operazione è idempotente (non crea duplicati).
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded mb-6">
            {error}
          </div>
        )}
        {result && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded mb-6">
            <p className="font-semibold">Dati caricati correttamente:</p>
            <p>Inseriti: {result.inserted}</p>
            <p>Saltati (duplicati): {result.skipped}</p>
          </div>
        )}
        <button
          onClick={() => { void handleSeedData() }}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? 'Caricamento in corso...' : 'Carica dati seed'}
        </button>
      </div>
    </div>
  )
}

export default AdminPage
