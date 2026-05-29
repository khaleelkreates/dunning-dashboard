import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import InvoiceModal from './InvoiceModal'

export default function InvoicesTab({ invoices, fetchInvoices, businessId }) {
  const [showModal, setShowModal] = useState(false)

  // Helper to get access token
  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token
  }

  const updateStatus = async (invoice, newStatus) => {
    try {
      const accessToken = await getAccessToken()
      
      if (!accessToken) {
        alert('No access token available. Please sign out and sign in again.')
        return
      }

      const response = await fetch('/api/update-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoice['Invoice Number'],
          status: newStatus,
          businessId: businessId,
          accessToken: accessToken
        })
      })
      
      if (response.ok) {
        await fetchInvoices()
      } else {
        const error = await response.json()
        alert('Error updating status: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Network error')
    }
  }

  const markAsPaid = (invoice) => updateStatus(invoice, 'Paid')
  const markAsExempt = (invoice) => updateStatus(invoice, 'Exempt')

  const downloadInvoice = (invoice) => {
    const csvContent = [
      ['Customer', 'Invoice #', 'Description', 'Amount', 'Due Date', 'Status'],
      [
        invoice['Customer Name'],
        invoice['Invoice Number'],
        invoice['Item Description'] || '-',
        invoice['Amount (₦)'],
        invoice['Due Date'],
        invoice['Status'] || 'Pending'
      ]
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice_${invoice['Invoice Number']}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveInvoice = async () => {
    await fetchInvoices()
  }

  return (
    <div>
      <div style={styles.header}>
        <h2>📄 Invoices</h2>
        <button onClick={() => setShowModal(true)} style={styles.addButton}>
          + New Invoice
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Invoice #</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.emptyRow}>No invoices yet. Click "+ New Invoice" to add.</td>
              </tr>
            ) : (
              invoices.map((inv, idx) => (
                <tr key={idx}>
                  <td>{inv['Customer Name']}</td>
                  <td>{inv['Invoice Number']}</td>
                  <td>{inv['Item Description'] || '-'}</td>
                  <td>₦{parseFloat(inv['Amount (₦)'] || 0).toLocaleString()}</td>
                  <td>{new Date(inv['Due Date']).toLocaleDateString()}</td>
                  <td style={{
                    color: inv.Status === 'Paid' ? '#27ae60' : inv.Status === 'Exempt' ? '#f39c12' : inv.Status === 'Overdue' ? '#e74c3c' : '#666',
                    fontWeight: 'bold'
                  }}>
                    {inv.Status || 'Pending'}
                  </td>
                  <td>
                    <button onClick={() => markAsPaid(inv)} style={styles.actionBtnPaid} title="Mark as Paid">✅</button>
                    <button onClick={() => markAsExempt(inv)} style={styles.actionBtnExempt} title="Exempt (skip reminders)">⏸️</button>
                    <button onClick={() => downloadInvoice(inv)} style={styles.actionBtnDownload} title="Download CSV">📥</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InvoiceModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={handleSaveInvoice}
        businessId={businessId}
      />
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  addButton: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  actionBtnPaid: {
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '4px',
    fontSize: '12px',
  },
  actionBtnExempt: {
    backgroundColor: '#f39c12',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '4px',
    fontSize: '12px',
  },
  actionBtnDownload: {
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  emptyRow: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
}