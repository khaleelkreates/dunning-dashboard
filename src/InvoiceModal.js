import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function InvoiceModal({ isOpen, onClose, onSave, businessId }) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    itemDescription: '',
    amount: '',
    issueDate: '',
    dueDate: ''
  })
  const [loading, setLoading] = useState(false)
  const [paymentTerms, setPaymentTerms] = useState(30)

  // Fetch payment terms from business settings
  useEffect(() => {
    const fetchPaymentTerms = async () => {
      if (!businessId) return
      
      const { data: business } = await supabase
        .from('businesses')
        .select('payment_terms')
        .eq('id', businessId)
        .single()
      
      if (business?.payment_terms) {
        setPaymentTerms(business.payment_terms)
      }
    }
    
    if (isOpen) {
      fetchPaymentTerms()
    }
  }, [businessId, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    
    // Auto-calculate due date when issue date changes
    if (name === 'issueDate' && value) {
      const issueDate = new Date(value)
      const dueDate = new Date(issueDate)
      dueDate.setDate(issueDate.getDate() + paymentTerms)
      setForm(prev => ({ ...prev, dueDate: dueDate.toISOString().split('T')[0] }))
    }
  }

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const accessToken = await getAccessToken()
      
      if (!accessToken) {
        alert('No access token available. Please sign out and sign in again.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/add-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          itemDescription: form.itemDescription,
          amount: form.amount,
          issueDate: form.issueDate,
          dueDate: form.dueDate,
          businessId: businessId,
          accessToken: accessToken
        })
      })

      const data = await response.json()

      if (data.success) {
        await onSave(form)
        onClose()
        setForm({ 
          customerName: '', 
          customerEmail: '', 
          itemDescription: '', 
          amount: '', 
          issueDate: '', 
          dueDate: '' 
        })
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Network error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>✨ New Invoice</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Customer Name *</label>
            <input
              name="customerName"
              type="text"
              value={form.customerName}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Customer Email *</label>
            <input
              name="customerEmail"
              type="email"
              value={form.customerEmail}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Item Description *</label>
            <input
              name="itemDescription"
              type="text"
              value={form.itemDescription}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Amount (₦) *</label>
            <input
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.dateRow}>
            <div style={styles.dateField}>
              <label style={styles.label}>Issue Date *</label>
              <input
                name="issueDate"
                type="date"
                value={form.issueDate}
                onChange={handleChange}
                required
                style={styles.dateInput}
              />
            </div>
            <div style={styles.dateField}>
              <label style={styles.label}>Due Date</label>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                style={styles.dateInput}
              />
              <span style={styles.hint}>Auto-calculated (Issue Date + {paymentTerms} days)</span>
            </div>
          </div>

          <div style={styles.buttons}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={styles.saveBtn}>
              {loading ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
  },
  fieldGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  dateRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    fontSize: '10px',
    color: '#999',
    marginTop: '4px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#e0e0e0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}