import type { FC } from 'react'
import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAIL = 'amanti84@gmail.com'

export const AdminPage: FC = () => {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (authLoading) {
    return <div className="p-8 text-center">Caricamento...</div>
  }

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />
  }

  const handleSeedData = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const functions = getFunctions()
      const seedUserData = httpsCallable<{ inserted: number; skipped: number }>(functions, 'seedUserData')
      const response = await seedUserData()

      const data = response.data as { success: boolean; data: { inserted: number; skipped: number } }

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
          L'operazione è idempotente (non crea duplicati).
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded mb-6">
            Dati caricati correttamente:
            <ul className="list-disc ml-6 mt-2">
              <li>Inseriti: {result.inserted}</li>
              <li>Saltati: {result.skipped}</li>
            </ul>
          </div>
        )}

        <button
          onClick={() => { void handleSeedData() }}
          disabled={loading}
          className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Caricamento in corso...' : 'Carica dati seed'}
        </button>
      </div>
    </div>
  )
}
