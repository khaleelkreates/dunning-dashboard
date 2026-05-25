import React, { useState } from 'react'

export default function InvoiceModal({ isOpen, onClose, onSave, businessId }) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    itemDescription: '',
    amount: '',
    dueDate: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/add-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          businessId: businessId
        })
      })

      const data = await response.json()

      if (data.success) {
        await onSave(form)
        onClose()
        setForm({ customerName: '', customerEmail: '', itemDescription: '', amount: '', dueDate: '' })
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
          <input
            name="customerName"
            placeholder="Customer name *"
            value={form.customerName}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            name="customerEmail"
            placeholder="Customer email *"
            type="email"
            value={form.customerEmail}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            name="itemDescription"
            placeholder="Item description *"
            value={form.itemDescription}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            name="amount"
            placeholder="Amount (₦) *"
            type="number"
            value={form.amount}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            name="dueDate"
            type="date"
            value={form.dueDate}
            onChange={handleChange}
            required
            style={styles.input}
          />
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
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
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