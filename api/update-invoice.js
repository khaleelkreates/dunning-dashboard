// api/update-invoice.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { invoiceNumber, status, businessId } = req.body

  if (!invoiceNumber || !status) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  console.log(`Updating invoice ${invoiceNumber} to status: ${status} for business ${businessId}`)

  return res.status(200).json({ success: true })
}