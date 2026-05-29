import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import logo from './logo.png'
import InvoicesTab from './InvoicesTab'

export default function Dashboard({ user, onLogout }) {
  const [business, setBusiness] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchBusiness = useCallback(async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_email', user.email)
      .single()

    if (!error) setBusiness(data)
  }, [user.email])

  const fetchInvoices = useCallback(async () => {
    if (!business?.id) return
    
    // Get current session for access token
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.provider_token
    
    if (!accessToken) {
      console.error('No access token available')
      return
    }
    
    try {
      const response = await fetch(`/api/get-invoices?businessId=${business.id}&accessToken=${accessToken}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      } else {
        const error = await response.json()
        console.error('Error fetching invoices:', error)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [business?.id])

  useEffect(() => {
    fetchBusiness()
  }, [fetchBusiness])

  useEffect(() => {
    if (business?.id) {
      fetchInvoices()
    }
  }, [business, fetchInvoices])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  // Calculate stats for overview
  const totalOutstanding = invoices
    .filter(inv => inv.Status !== 'Paid' && inv.Status !== 'Exempt')
    .reduce((sum, inv) => sum + (parseFloat(inv['Amount (₦)']) || 0), 0)
  
  const overdueCount = invoices.filter(inv => {
    if (inv.Status === 'Paid' || inv.Status === 'Exempt') return false
    const dueDate = new Date(inv['Due Date'])
    return dueDate < new Date()
  }).length

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
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <h3>💰 Total Outstanding</h3>
                  <p style={styles.statNumber}>₦{totalOutstanding.toLocaleString()}</p>
                  <p style={styles.statSub}>{invoices.length} total invoices</p>
                </div>
                <div style={styles.statCard}>
                  <h3>⚠️ Overdue</h3>
                  <p style={styles.statNumber}>{overdueCount}</p>
                  <p style={styles.statSub}>Invoices past due</p>
                </div>
                <div style={styles.statCard}>
                  <h3>📈 Recovery Rate</h3>
                  <p style={styles.statNumber}>--%</p>
                  <p style={styles.statSub}>Coming soon</p>
                </div>
                <div style={styles.statCard}>
                  <h3>📧 Reminders Sent</h3>
                  <p style={styles.statNumber}>--</p>
                  <p style={styles.statSub}>Coming soon</p>
                </div>
              </div>
              <div style={styles.welcomeCard}>
                <h2>🎉 Welcome to Smart Dunning Agent</h2>
                <p>Your automated receivables intelligence system is live.</p>
                <p>Total outstanding: <strong>₦{totalOutstanding.toLocaleString()}</strong> across {invoices.length} invoices.</p>
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
                <input type="number" defaultValue={business?.reminder_interval || 3} style={styles.settingInput} />
              </div>
              <div style={styles.settingRow}>
                <label>Overdue Threshold (days)</label>
                <input type="number" defaultValue={business?.overdue_threshold || 7} style={styles.settingInput} />
              </div>
              <div style={styles.settingRow}>
                <label>
                  <input type="checkbox" defaultChecked={business?.use_ai || false} />
                  Use AI Reminders (Gemini)
                </label>
              </div>
              <button style={styles.saveSettingsBtn}>Save Settings</button>
              <p style={{marginTop: '20px', fontSize: '13px', color: '#666'}}>
                ⏳ Settings page coming soon – your dunning script is already running with default settings.
              </p>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={styles.emptyState}>
              <p>📜 Dunning log will appear here once reminders start sending.</p>
              <p style={{fontSize: 14, color: '#666'}}>Check your Google Sheet's "Dunning Log" tab for now.</p>
            </div>
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
  settingsCard: { backgroundColor: 'white', padding: '32px', borderRadius: '12px' },
  settingRow: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  settingInput: { padding: '10px', border: '1px solid #ddd', borderRadius: '8px', width: '200px' },
  saveSettingsBtn: { backgroundColor: '#1a1a2e', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  loadingContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #1a1a2e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
}