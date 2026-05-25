import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import logo from './logo.png'

export default function Dashboard({ user, onLogout }) {
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchBusiness = useCallback(async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_email', user.email)
      .single()

    if (error) {
      console.error('Error fetching business:', error)
    } else {
      setBusiness(data)
    }
    setLoading(false)
  }, [user.email])

  useEffect(() => {
    fetchBusiness()
  }, [fetchBusiness])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

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
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="Smart Dunning Agent" style={styles.logo} />
          <h2 style={styles.logoText}>Smart Dunning</h2>
        </div>
        <nav style={styles.nav}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={{...styles.navItem, ...(activeTab === 'overview' ? styles.navItemActive : {})}}
          >
            📊 Overview
          </button>
          <button 
            onClick={() => setActiveTab('invoices')} 
            style={{...styles.navItem, ...(activeTab === 'invoices' ? styles.navItemActive : {})}}
          >
            📄 Invoices
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            style={{...styles.navItem, ...(activeTab === 'settings' ? styles.navItemActive : {})}}
          >
            ⚙️ Settings
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            style={{...styles.navItem, ...(activeTab === 'logs' ? styles.navItemActive : {})}}
          >
            📋 Dunning Log
          </button>
        </nav>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          🚪 Logout
        </button>
      </div>

      {/* Main Content */}
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
                  <p style={styles.statNumber}>₦0</p>
                  <p style={styles.statSub}>Across 0 invoices</p>
                </div>
                <div style={styles.statCard}>
                  <h3>⚠️ Overdue</h3>
                  <p style={styles.statNumber}>0</p>
                  <p style={styles.statSub}>Invoices</p>
                </div>
                <div style={styles.statCard}>
                  <h3>📈 Recovery Rate</h3>
                  <p style={styles.statNumber}>0%</p>
                  <p style={styles.statSub}>Last 30 days</p>
                </div>
                <div style={styles.statCard}>
                  <h3>📧 Reminders Sent</h3>
                  <p style={styles.statNumber}>0</p>
                  <p style={styles.statSub}>This month</p>
                </div>
              </div>
              <div style={styles.welcomeCard}>
                <h2>🎉 Welcome to Smart Dunning Agent</h2>
                <p>Your automated receivables intelligence system is ready.</p>
                <p>👉 <strong>Next step:</strong> Connect your Google Sheet to start managing invoices.</p>
                <button style={styles.connectBtn} onClick={() => setActiveTab('settings')}>
                  Connect Google Sheet
                </button>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div style={styles.emptyState}>
              <p>📭 No invoices yet</p>
              <p style={{ fontSize: 14, color: '#666' }}>Your invoices will appear here once you connect your Google Sheet.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={styles.settingsCard}>
              <h3>Google Sheets Setup</h3>
              <p>Click the button below to connect your Google account and create your dunning spreadsheet.</p>
              <button style={styles.connectBtn}>
                🔗 Connect Google Sheets
              </button>
              <hr style={{ margin: '30px 0' }} />
              <h3>Dunning Settings</h3>
              <p>Coming soon: Configure reminder intervals, thresholds, and AI preferences.</p>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={styles.emptyState}>
              <p>📜 No activity yet</p>
              <p style={{ fontSize: 14, color: '#666' }}>Dunning logs will appear here once reminders start sending.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
    padding: '0 8px',
  },
  logo: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '15px',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  navItemActive: {
    backgroundColor: '#2d2d44',
    color: 'white',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #444',
    color: '#aaa',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '20px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 32px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    textAlign: 'right',
  },
  userEmail: {
    fontSize: '12px',
    color: '#666',
    display: 'block',
  },
  content: {
    padding: '32px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '10px 0',
    color: '#1a1a2e',
  },
  statSub: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
  },
  welcomeCard: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px',
    color: '#666',
  },
  settingsCard: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
  },
  connectBtn: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '16px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1a1a2e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}