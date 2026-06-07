import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import TerminalLoader from './TerminalLoader'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, login } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <TerminalLoader text="VERIFYING CREDENTIALS" />
      </div>
    )
  }

  if (!user) {
    // Force a login redirect
    login()
    return null
  }

  return <>{children}</>
}
