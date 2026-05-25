import React, { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignup = async (e) => {
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

    setMessage('✅ Account created! You can now login.')
    setLoading(false)
    // Clear form
    setEmail('')
    setPassword('')
    setBusinessName('')
  }

  return (
    <form onSubmit={handleSignup} style={styles.form}>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Business Name</label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          style={styles.input}
          placeholder="Your Business Name"
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
          placeholder="you@example.com"
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
          placeholder="••••••••"
        />
      </div>
      <button type="submit" disabled={loading} style={styles.button}>
        {loading ? 'Creating account...' : 'Start Free Trial'}
      </button>
      {message && <p style={message.includes('✅') ? styles.successMessage : styles.errorMessage}>{message}</p>}
    </form>
  )
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
  },
  button: {
    backgroundColor: '#667eea',
    color: 'white',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  errorMessage: {
    color: '#e74c3c',
    fontSize: '14px',
    marginTop: '12px',
    textAlign: 'center',
  },
  successMessage: {
    color: '#27ae60',
    fontSize: '14px',
    marginTop: '12px',
    textAlign: 'center',
  },
}