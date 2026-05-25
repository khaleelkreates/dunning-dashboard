// api/add-invoice.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { customerName, customerEmail, itemDescription, amount, dueDate, businessId } = req.body

  if (!customerName || !customerEmail || !itemDescription || !amount || !dueDate) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const invoiceNumber = `INV-${Date.now()}`
  const issueDate = new Date().toISOString().split('T')[0]

  console.log('New invoice saved:', {
    customerName,
    customerEmail,
    invoiceNumber,
    itemDescription,
    amount,
    issueDate,
    dueDate,
    status: 'Not Due',
    businessId
  })

  return res.status(200).json({
    success: true,
    invoiceNumber,
    message: 'Invoice created successfully'
  })
}