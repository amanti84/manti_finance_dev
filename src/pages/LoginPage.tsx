import type { FC } from 'react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Logo } from '../components/Logo'
import { Button, Badge } from '../components/ui'

export const LoginPage: FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { user, loading: authLoading, signInWithGoogle } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Logo size="lg" />
          <p className="text-text-muted font-medium">Caricamento in corso...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async () => {
    setError(null)
    setIsLoggingIn(true)

    try {
      const result = await signInWithGoogle()

      if (!result.success) {
        setError(
          result.error === 'unauthorized'
            ? 'Account non autorizzato. Contatta l’amministratore.'
            : 'Accesso non riuscito. Riprova.'
        )
      }
    } catch {
      setError('Si è verificato un errore imprevisto. Riprova.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <Logo size="lg" className="mb-4" />
          <h1 className="text-2xl font-bold text-text tracking-tight mb-2">Manti Finance</h1>
          <p className="text-text-muted text-center max-w-xs">
            La tua finanza personale, sotto controllo.
          </p>
        </div>

        <div className="bg-surface p-8 rounded-2xl shadow-md border border-border">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-text mb-1">Bentornato</h2>
              <p className="text-sm text-text-muted">Accedi al tuo financial copilot</p>
            </div>

            {error && (
              <div className="flex justify-center">
                <Badge variant="error" className="py-2 px-4 rounded-lg w-full justify-center text-center">
                  {error}
                </Badge>
              </div>
            )}

            <Button
              onClick={() => { void handleLogin() }}
              isLoading={isLoggingIn}
              variant="secondary"
              className="w-full h-12 shadow-sm border-border hover:border-primary/50 hover:bg-surface transition-all active:scale-[0.98]"
              leftIcon={
                <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              }
            >
              Accedi con Google
            </Button>
          </div>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">
            Accesso riservato — solo account autorizzati
          </p>
        </footer>
      </div>
    </div>
  )
}
