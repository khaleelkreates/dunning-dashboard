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
    // Check if there's a hash fragment with access_token
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Redirect to callback page with the hash
      window.location.href = '/auth/callback' + window.location.hash
    }
  }, [])

  // Check session and auth changes
  useEffect(() => {
    // Skip auth check if on callback page (callback handles it)
    if (isCallback) return

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Cleanup
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [isCallback])

  // Show callback page
  if (isCallback) {
    return <AuthCallback />
  }

  // Show dashboard if logged in
  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />
  }

  // Show auth pages
  if (showSignup) {
    return (
      <div>
        <Signup />
        <p style={{ textAlign: 'center', marginTop: 20 }}>
          Already have an account?{' '}
          <button
            onClick={() => setShowSignup(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a1a2e',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Login
          </button>
        </p>
      </div>
    )
  }

  return (
    <div>
      <Login onLogin={(user) => setUser(user)} />
      <p style={{ textAlign: 'center', marginTop: 20 }}>
        Don't have an account?{' '}
        <button
          onClick={() => setShowSignup(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#1a1a2e',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Start Free Trial
        </button>
      </p>
    </div>
  )
}

export default App