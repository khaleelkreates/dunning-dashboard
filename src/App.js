// src/App.js
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Signup from './Signup'
import Login from './Login'
import Dashboard from './Dashboard'
import AuthCallback from './pages/auth/callback'

function App() {
  const [user, setUser] = useState(null)
  const [showSignup, setShowSignup] = useState(false)
  const [isCallback, setIsCallback] = useState(false)

  // Check if we're on the callback route
  useEffect(() => {
    const path = window.location.pathname
    setIsCallback(path === '/auth/callback')
  }, [])

  // Handle hash fragment redirect (for OAuth callback)
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.location.href = '/auth/callback' + window.location.hash
    }
  }, [])

  // Check session and auth changes
  useEffect(() => {
    if (isCallback) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [isCallback])

  // Show callback page (Google OAuth)
  if (isCallback) {
    return <AuthCallback />
  }

  // Show dashboard if logged in
  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />
  }

  // Show signup page
  if (showSignup) {
    return <Signup onSwitchToLogin={() => setShowSignup(false)} />
  }

  // Show login page
  return <Login onLogin={(user) => setUser(user)} onSwitchToSignup={() => setShowSignup(true)} />
}

export default App