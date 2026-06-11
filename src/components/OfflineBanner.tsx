import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export const OfflineBanner: FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-error text-white py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-[60] animate-in slide-in-from-top duration-300">
      <WifiOff size={18} />
      <span className="text-sm font-medium">
        Modalità offline — i dati potrebbero non essere aggiornati
      </span>
    </div>
  )
}
