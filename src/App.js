import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Signup from './Signup'
import Login from './Login'
import Dashboard from './Dashboard'
import logo from './logo.png'

function App() {
  const [user, setUser] = useState(null)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="Smart Dunning Agent" style={styles.logo} />
          <h1 style={styles.title}>Smart Dunning Agent</h1>
          <p style={styles.subtitle}>Automated Receivables Intelligence</p>
        </div>
        
        {showSignup ? <Signup /> : <Login onLogin={(user) => setUser(user)} />}
        
        <div style={styles.switchContainer}>
          <p style={styles.switchText}>
            {showSignup ? 'Already have an account?' : "Don't have an account?"}
            <button 
              onClick={() => setShowSignup(!showSignup)} 
              style={styles.switchButton}
            >
              {showSignup ? 'Login' : 'Start Free Trial'}
            </button>
          </p>
        </div>
      </div>
      
      <div style={styles.footer}>
        <p>© 2026 Smart Dunning Agent. All rights reserved.</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    padding: '40px',
    width: '100%',
    maxWidth: '450px',
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a2e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  switchContainer: {
    textAlign: 'center',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e0e0e0',
  },
  switchText: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginLeft: '8px',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
}

export default App