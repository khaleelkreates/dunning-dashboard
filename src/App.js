import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Signup from './Signup'
import Login from './Login'
import Dashboard from './Dashboard'

function App() {
  const [user, setUser] = useState(null)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes - FIXED VERSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Cleanup - FIXED
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />
  }

  if (showSignup) {
    return (
      <div>
        <Signup />
        <p style={{ textAlign: 'center', marginTop: 20 }}>
          Already have an account?{' '}
          <button 
            onClick={() => setShowSignup(false)} 
            style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
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
          style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
        >
          Start Free Trial
        </button>
      </p>
    </div>
  )
}

export default App