// api/update-invoice.js
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://hiltlozttngjthpudyea.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY
  if (!key) return undefined
  return key.replace(/\\n/g, '\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { invoiceNumber, status, businessId } = req.body

  if (!invoiceNumber || !status || !businessId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Get business's spreadsheet ID
    const { data: business } = await supabase
      .from('businesses')
      .select('spreadsheet_id')
      .eq('id', businessId)
      .single()

    if (!business?.spreadsheet_id) {
      return res.status(404).json({ error: 'Spreadsheet not found' })
    }

    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: getPrivateKey(),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Find the row with matching invoice number
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: business.spreadsheet_id,
      range: 'Invoices!A:K',
    })

    const rows = response.data.values || []
    let rowIndex = -1

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][2] === invoiceNumber) {
        rowIndex = i + 1
        break
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Update status column (H = index 7)
    await sheets.spreadsheets.values.update({
      spreadsheetId: business.spreadsheet_id,
      range: `Invoices!H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status]],
      },
    })

    return res.status(200).json({ success: true })

  } catch (error) {
    console.error('Update invoice error:', error)
    return res.status(500).json({ error: error.message })
  }
}