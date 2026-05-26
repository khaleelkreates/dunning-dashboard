// src/pages/auth/callback.js
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function AuthCallback() {
  const [message, setMessage] = useState('Setting up your account...')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError
        if (!session) throw new Error('No session found')

        setMessage('Welcome! Setting up your workspace...')

        // Check if business already exists
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('id, spreadsheet_id')
          .eq('owner_email', session.user.email)
          .single()

        let businessId
        let businessName

        if (!existingBusiness) {
          setMessage('Creating your account...')
          
          // Create new business record
          businessName = session.user.user_metadata?.full_name?.split(' ')[0] || 
                         session.user.email?.split('@')[0] || 
                         'My Business'
          
          const { data: newBusiness, error: createError } = await supabase
            .from('businesses')
            .insert([
              {
                business_name: businessName,
                owner_email: session.user.email,
                status: 'active',
                google_refresh_token: session.provider_refresh_token,
              }
            ])
            .select()
            .single()

          if (createError) throw createError
          
          businessId = newBusiness.id
          
          // Provision Google Sheet for new business
          setMessage('Creating your Google Sheet...')
          
          const provisionResponse = await fetch('/api/provision-business', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: businessId,
              businessName: businessName,
              ownerEmail: session.user.email,
              refreshToken: session.provider_refresh_token,
            })
          })
          
          if (!provisionResponse.ok) {
            console.error('Provision failed, but continuing...')
          }
          
        } else {
          setMessage('Updating your account...')
          businessId = existingBusiness.id
          
          // Update existing business with Google tokens
          await supabase
            .from('businesses')
            .update({
              google_refresh_token: session.provider_refresh_token,
            })
            .eq('id', existingBusiness.id)
        }

        setMessage('Redirecting to dashboard...')
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)

      } catch (err) {
        console.error('Callback error:', err)
        setMessage(`Error: ${err.message}`)
        setStatus('error')
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <h2 style={styles.title}>Smart Dunning Agent</h2>
      <p style={styles.message}>{message}</p>
      {status === 'error' && (
        <button onClick={() => window.location.href = '/'} style={styles.button}>
          Go Back
        </button>
      )}
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
    backgroundColor: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #1a1a2e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: '12px',
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
}

// Add animation
const styleSheet = document.createElement("style")
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`
document.head.appendChild(styleSheet)