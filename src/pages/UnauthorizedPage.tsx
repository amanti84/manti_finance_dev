import React from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBackToLogin = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center border border-gray-200">
        <h1 className="text-2xl font-bold mb-2 text-red-600">Accesso negato</h1>
        <p className="text-gray-600 mb-6">
          Il tuo account non è autorizzato ad accedere a questa applicazione.
        </p>
        <button
          onClick={() => { void handleBackToLogin() }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-medium"
        >
          Torna al login
        </button>
      </div>
    </div>
  )
}
