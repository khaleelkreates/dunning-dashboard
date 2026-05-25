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

    // 1. Sign up user with Supabase Auth
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setMessage(`Auth error: ${authError.message}`)
      setLoading(false)
      return
    }

    // 2. Create business record
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
      setMessage(`Business error: ${businessError.message}`)
      setLoading(false)
      return
    }

    setMessage('✅ Account created! Check your email to confirm.')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto', padding: 20 }}>
      <h2>Start Free Trial</h2>
      <form onSubmit={handleSignup}>
        <div>
          <label>Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginBottom: 15 }}
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginBottom: 15 }}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginBottom: 15 }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Creating account...' : 'Start Free Trial'}
        </button>
      </form>
      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  )
}