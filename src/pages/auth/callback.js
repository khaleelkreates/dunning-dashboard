// src/pages/auth/callback.js
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Setting up your account...')

  useEffect(() => {
    const handleCallback = async () => {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        setMessage('Error: Could not get session')
        setTimeout(() => navigate('/'), 3000)
        return
      }

      const user = session.user
      const providerToken = session.provider_token
      const refreshToken = session.provider_refresh_token

      setMessage('Creating your Google Sheet...')

      // Call your provision API
      const response = await fetch('/api/provision-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: user.id,
          businessName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Business',
          ownerEmail: user.email,
          accessToken: providerToken,
          refreshToken: refreshToken,
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Account ready! Redirecting to dashboard...')
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        setMessage('Error: ' + data.error)
        setTimeout(() => navigate('/'), 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p>{message}</p>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1a1a2e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
}