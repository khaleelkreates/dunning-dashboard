import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import logo from './logo.png'
import InvoicesTab from './InvoicesTab'

export default function Dashboard({ user, onLogout }) {
  const [business, setBusiness] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [dunningLogs, setDunningLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Settings state
  const [reminderInterval, setReminderInterval] = useState(3)
  const [overdueThreshold, setOverdueThreshold] = useState(7)
  const [useAI, setUseAI] = useState(false)

  const fetchBusiness = useCallback(async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_email', user.email)
      .single()

    if (!error && data) {
      setBusiness(data)
      setReminderInterval(data.reminder_interval || 3)
      setOverdueThreshold(data.overdue_threshold || 7)
      setUseAI(data.use_ai || false)
    }
  }, [user.email])

  const fetchInvoices = useCallback(async () => {
    if (!business?.id) {
      setLoading(false)
      return
    }
    
    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Fetch invoices timeout - forcing loading false')
      setLoading(false)
    }, 10000)
    
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.provider_token
    
    try {
      const response = await fetch(`/api/get-invoices?businessId=${business.id}&accessToken=${accessToken || ''}`)
      const data = await response.json()
      setInvoices(data.invoices || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setInvoices([])
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [business?.id])

  const fetchDunningLogs = useCallback(async () => {
    if (!business?.id) return
    
    const timeoutId = setTimeout(() => {
      console.log('Fetch logs timeout')
    }, 10000)
    
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.provider_token
    
    try {
      const response = await fetch(`/api/get-dunning-log?businessId=${business.id}&accessToken=${accessToken || ''}`)
      const data = await response.json()
      setDunningLogs(data.logs || [])
    } catch (error) {
      console.error('Error fetching dunning logs:', error)
      setDunningLogs([])
    } finally {
      clearTimeout(timeoutId)
    }
  }, [business?.id])

  const saveSettings = async () => {
    setSavingSettings(true)
    setSettingsMessage('')
    
    const { error } = await supabase
      .from('businesses')
      .update({
        reminder_interval: reminderInterval,
        overdue_threshold: overdueThreshold,
        use_ai: useAI,
      })
      .eq('id', business.id)
    
    if (error) {
      setSettingsMessage('Error: ' + error.message)
    } else {
      // Update Google Sheet settings
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/update-sheet-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            accessToken: session?.provider_token,
            settings: { reminderInterval, overdueThreshold, useAI }
          })
        })
      } catch (err) {
        console.error('Failed to update sheet settings:', err)
      }
      
      await fetchBusiness()
      setSettingsMessage('✅ Settings saved successfully!')
      setTimeout(() => setSettingsMessage(''), 3000)
    }
    setSavingSettings(false)
  }

  const connectGoogle = async () => {
    setIsConnecting(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?connect=true`
      }
    })
    if (error) alert(error.message)
    setIsConnecting(false)
  }

  useEffect(() => {
    fetchBusiness()
  }, [fetchBusiness])

  useEffect(() => {
    if (business?.id) {
      if (!business.spreadsheet_id) {
        setLoading(false)
        setInvoices([])
      } else {
        fetchInvoices()
        fetchDunningLogs()
      }
    }
  }, [business, fetchInvoices, fetchDunningLogs])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  // Calculate stats
  const totalPaid = invoices
    .filter(inv => inv.Status === 'Paid')
    .reduce((sum, inv) => sum + (parseFloat(inv['Amount (₦)']) || 0), 0)
  
  const totalOutstanding = invoices
    .filter(inv => inv.Status !== 'Paid' && inv.Status !== 'Exempt')
    .reduce((sum, inv) => sum + (parseFloat(inv['Amount (₦)']) || 0), 0)
  
  const totalInvoiced = totalPaid + totalOutstanding
  const recoveryRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0
  
  const overdueCount = invoices.filter(inv => {
    if (inv.Status === 'Paid' || inv.Status === 'Exempt') return false
    const dueDate = new Date(inv['Due Date'])
    return dueDate < new Date()
  }).length

  const remindersSent = invoices.reduce((count, inv) => {
    if (inv['Last Email Sent Date'] && inv['Last Email Sent Date'] !== '') return count + 1
    return count
  }, 0)

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="Smart Dunning Agent" style={styles.logo} />
          <h2 style={styles.logoText}>Smart Dunning</h2>
        </div>
        <nav style={styles.nav}>
          <button onClick={() => setActiveTab('overview')} style={{...styles.navItem, ...(activeTab === 'overview' ? styles.navItemActive : {})}}>
            📊 Overview
          </button>
          <button onClick={() => setActiveTab('invoices')} style={{...styles.navItem, ...(activeTab === 'invoices' ? styles.navItemActive : {})}}>
            📄 Invoices
          </button>
          <button onClick={() => setActiveTab('settings')} style={{...styles.navItem, ...(activeTab === 'settings' ? styles.navItemActive : {})}}>
            ⚙️ Settings
          </button>
          <button onClick={() => setActiveTab('logs')} style={{...styles.navItem, ...(activeTab === 'logs' ? styles.navItemActive : {})}}>
            📋 Dunning Log
          </button>
        </nav>
        <button onClick={handleLogout} style={styles.logoutBtn}>🚪 Logout</button>
      </div>

      <div style={styles.main}>
        <header style={styles.header}>
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          <div style={styles.userInfo}>
            <span>{business?.business_name}</span>
            <span style={styles.userEmail}>{user.email}</span>
          </div>
        </header>

        <div style={styles.content}>
          {activeTab === 'overview' && (
            <div>
              <p style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
              </p>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <h3>💰 Total Outstanding</h3>
                  <p style={styles.statNumber}>₦{totalOutstanding.toLocaleString()}</p>
                  <p style={styles.statSub}>{invoices.length - overdueCount} paid / {invoices.length} total</p>
                </div>
                <div style={styles.statCard}>
                  <h3>⚠️ Overdue</h3>
                  <p style={styles.statNumber}>{overdueCount}</p>
                  <p style={styles.statSub}>Invoices past due</p>
                </div>
                <div style={styles.statCard}>
                  <h3>📈 Recovery Rate</h3>
                  <p style={styles.statNumber}>{recoveryRate}%</p>
                  <p style={styles.statSub}>₦{totalPaid.toLocaleString()} collected</p>
                </div>
                <div style={styles.statCard}>
                  <h3>📧 Reminders Sent</h3>
                  <p style={styles.statNumber}>{remindersSent}</p>
                  <p style={styles.statSub}>Total emails sent</p>
                </div>
              </div>
              <div style={styles.welcomeCard}>
                <h2>🎉 Welcome to Smart Dunning Agent</h2>
                <p>Your automated receivables intelligence system is live.</p>
                <div style={styles.statsInline}>
                  <div><strong>₦{totalOutstanding.toLocaleString()}</strong><span>Outstanding</span></div>
                  <div><strong>{recoveryRate}%</strong><span>Recovery Rate</span></div>
                  <div><strong>{overdueCount}</strong><span>Overdue Invoices</span></div>
                </div>
                <p style={{marginTop: '16px', fontSize: '14px', color: '#666'}}>
                  ✅ Dunning emails are being sent automatically every {business?.reminder_interval || 3} days<br/>
                  📊 Go to <strong>Invoices</strong> tab to manage your invoices
                </p>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <InvoicesTab 
              invoices={invoices} 
              fetchInvoices={fetchInvoices} 
              businessId={business?.id}
            />
          )}

          {activeTab === 'settings' && (
            <div style={styles.settingsCard}>
              <h3>⚙️ Dunning Settings</h3>
              <p>Configure your reminder schedule and preferences.</p>
              
              <div style={styles.settingRow}>
                <label>Reminder Interval (days)</label>
                <input type="number" value={reminderInterval} onChange={(e) => setReminderInterval(parseInt(e.target.value) || 3)} min="1" max="30" style={styles.settingInput} />
                <span style={styles.settingHint}>How many days between reminder emails</span>
              </div>
              
              <div style={styles.settingRow}>
                <label>Overdue Threshold (days)</label>
                <input type="number" value={overdueThreshold} onChange={(e) => setOverdueThreshold(parseInt(e.target.value) || 7)} min="1" max="90" style={styles.settingInput} />
                <span style={styles.settingHint}>After how many days an invoice becomes "Overdue"</span>
              </div>
              
              <div style={styles.settingRow}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
                  Use AI Reminders (Gemini)
                </label>
                <span style={styles.settingHint}>AI generates personalized reminder messages</span>
              </div>
              
              <button onClick={saveSettings} disabled={savingSettings} style={styles.saveSettingsBtn}>
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
              
              {settingsMessage && <p style={settingsMessage.includes('Error') ? styles.errorMsg : styles.successMsg}>{settingsMessage}</p>}
              
              <hr style={styles.divider} />
              
              {business?.google_refresh_token ? (
                <p style={{color: '#27ae60', fontSize: '13px'}}>✅ Google account connected</p>
              ) : (
                <div style={styles.connectGoogleBox}>
                  <p style={{color: '#e74c3c', fontSize: '13px'}}>⚠️ Google account not connected</p>
                  <p style={{fontSize: '12px', color: '#666'}}>You need to connect Google to add invoices.</p>
                  <button onClick={connectGoogle} disabled={isConnecting} style={styles.connectGoogleBtn}>
                    {isConnecting ? 'Connecting...' : '🔗 Connect Google Account'}
                  </button>
                </div>
              )}
              
              <div style={styles.infoBox}>
                <h4>📌 How Settings Affect Your Dunning Script</h4>
                <ul style={styles.infoList}>
                  <li><strong>Reminder Interval:</strong> Controls how often customers receive follow-up emails.</li>
                  <li><strong>Overdue Threshold:</strong> Invoices become "Overdue" after this many days past due date.</li>
                  <li><strong>AI Reminders:</strong> When enabled, the system uses Gemini AI to generate personalized messages.</li>
                </ul>
                <p style={styles.infoNote}>⚡ Changes take effect immediately and sync to your Google Sheet.</p>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            dunningLogs.length === 0 ? (
              <div style={styles.emptyState}>
                <p>📜 No dunning activity yet.</p>
                <p style={{fontSize: 14, color: '#666'}}>When reminders are sent, they'll appear here.</p>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Days Overdue</th>
                      <th>Message</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dunningLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td>{log.Timestamp ? new Date(log.Timestamp).toLocaleString() : '-'}</td>
                        <td>{log.Customer}</td>
                        <td>{log.Invoice}</td>
                        <td>{log['Days Overdue']}</td>
                        <td>{log['Message Preview']}</td>
                        <td>{log.Status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  app: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa' },
  sidebar: { width: '260px', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column', padding: '24px 16px' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' },
  logo: { width: '40px', height: '40px', objectFit: 'contain' },
  logoText: { fontSize: '18px', fontWeight: 'bold', margin: 0 },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  navItem: { background: 'none', border: 'none', color: '#aaa', padding: '12px 16px', textAlign: 'left', fontSize: '15px', cursor: 'pointer', borderRadius: '8px' },
  navItemActive: { backgroundColor: '#2d2d44', color: 'white' },
  logoutBtn: { background: 'none', border: '1px solid #444', color: '#aaa', padding: '10px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  header: { backgroundColor: 'white', padding: '20px 32px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { textAlign: 'right' },
  userEmail: { fontSize: '12px', color: '#666', display: 'block' },
  content: { padding: '32px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statNumber: { fontSize: '32px', fontWeight: 'bold', margin: '10px 0', color: '#1a1a2e' },
  statSub: { fontSize: '12px', color: '#666', margin: 0 },
  welcomeCard: { backgroundColor: 'white', padding: '32px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statsInline: { display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '20px' },
  settingsCard: { backgroundColor: 'white', padding: '32px', borderRadius: '12px', maxWidth: '600px' },
  settingRow: { marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' },
  settingInput: { padding: '10px', border: '1px solid #ddd', borderRadius: '8px', width: '200px', fontSize: '14px' },
  settingHint: { fontSize: '12px', color: '#999' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  saveSettingsBtn: { backgroundColor: '#1a1a2e', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginTop: '8px' },
  divider: { margin: '24px 0', border: 'none', borderTop: '1px solid #e0e0e0' },
  connectGoogleBox: { backgroundColor: '#fef3c7', padding: '16px', borderRadius: '12px', marginTop: '16px' },
  connectGoogleBtn: { backgroundColor: '#1a1a2e', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '8px' },
  infoBox: { backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px' },
  infoList: { margin: '12px 0', paddingLeft: '20px', lineHeight: '1.6', color: '#555' },
  infoNote: { fontSize: '13px', color: '#666', marginTop: '12px', fontStyle: 'italic' },
  errorMsg: { color: '#e74c3c', fontSize: '14px', marginTop: '12px' },
  successMsg: { color: '#27ae60', fontSize: '14px', marginTop: '12px' },
  emptyState: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  tableContainer: { backgroundColor: 'white', borderRadius: '12px', overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  loadingContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #1a1a2e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
}