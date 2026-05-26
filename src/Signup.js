// src/Signup.js
import React, { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setMessage(authError.message)
      setLoading(false)
      return
    }

    const { error: businessError } = await supabase
      .from('businesses')
      .insert([
        {
          business_name: businessName,
          owner_email: email,
          status: 'pending',
        }
      ])

    if (businessError) {
      setMessage(businessError.message)
      setLoading(false)
      return
    }

    setMessage('✅ Account created! Check your email to confirm.')
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.send',
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      alert(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2>✨ Start Free Trial</h2>
          <p>Join hundreds of businesses automating their receivables</p>
        </div>

        <form onSubmit={handleEmailSignup} style={styles.form}>
          <div style={styles.inputGroup}>
            <label>Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your Business Name"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Creating account...' : 'Start Free Trial'}
          </button>
        </form>

        <div style={styles.divider}>
          <span>or</span>
        </div>

        <button onClick={handleGoogleSignup} disabled={loading} style={styles.googleBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" style={styles.googleIcon}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {message && <p style={message.includes('✅') ? styles.successMsg : styles.errorMsg}>{message}</p>}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  divider: {
    textAlign: 'center',
    margin: '24px 0',
    position: 'relative',
    borderBottom: '1px solid #e0e0e0',
    lineHeight: '0.1em',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  googleIcon: {
    marginRight: '8px',
  },
  errorMsg: {
    color: '#e74c3c',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '20px',
  },
  successMsg: {
    color: '#27ae60',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '20px',
  },
}

// Add input focus effect with style injection
const styleSheet = document.createElement("style")
styleSheet.textContent = `
  input:focus {
    border-color: #1a1a2e !important;
    box-shadow: 0 0 0 2px rgba(26, 26, 46, 0.1);
  }
  button:hover {
    opacity: 0.9;
  }
`
document.head.appendChild(styleSheet)