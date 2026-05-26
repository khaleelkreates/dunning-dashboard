// api/get-invoices.js
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
  const { businessId } = req.query

  if (!businessId) {
    return res.status(400).json({ error: 'Business ID required' })
  }

  try {
    // Get business's spreadsheet ID
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('spreadsheet_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business?.spreadsheet_id) {
      return res.status(200).json({ invoices: [], message: 'No sheet found' })
    }

    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: getPrivateKey(),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Read data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: business.spreadsheet_id,
      range: 'Invoices!A:K',
    })

    const rows = response.data.values || []
    
    if (rows.length <= 1) {
      return res.status(200).json({ invoices: [] })
    }

    const headers = rows[0]
    const invoices = rows.slice(1).map(row => {
      const invoice = {}
      headers.forEach((header, index) => {
        invoice[header] = row[index] || ''
      })
      return invoice
    })

    return res.status(200).json({ invoices })

  } catch (error) {
    console.error('Get invoices error:', error)
    return res.status(500).json({ error: error.message })
  }
}