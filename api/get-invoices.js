// api/get-invoices.js
export default async function handler(req, res) {
  const { businessId } = req.query

  // Return demo data for now
  const demoInvoices = [
    {
      'Customer Name': 'John Demo',
      'Customer Email': 'john@demo.com',
      'Invoice Number': 'INV-DEMO-001',
      'Item Description': 'Web Development',
      'Amount (₦)': 50000,
      'Issue Date': '2026-05-01',
      'Due Date': '2026-05-15',
      'Status': 'Not Due'
    },
    {
      'Customer Name': 'Jane Test',
      'Customer Email': 'jane@test.com',
      'Invoice Number': 'INV-DEMO-002',
      'Item Description': 'Consulting',
      'Amount (₦)': 125000,
      'Issue Date': '2026-04-01',
      'Due Date': '2026-04-20',
      'Status': 'Overdue'
    }
  ]

  return res.status(200).json({ invoices: demoInvoices })
}