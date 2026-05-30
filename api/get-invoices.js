// api/get-invoices.js
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hiltlozttngjthpudyea.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { businessId, accessToken } = req.query

  // Business ID is required
  if (!businessId) {
    return res.status(400).json({ error: 'Business ID required' })
  }

  try {
    // Get business's spreadsheet ID
    const { data: business } = await supabase
      .from('businesses')
      .select('spreadsheet_id')
      .eq('id', businessId)
      .single()

    // If no spreadsheet ID, return empty immediately (no token needed)
    if (!business?.spreadsheet_id) {
      return res.status(200).json({ 
        invoices: [], 
        message: 'No sheet linked yet' 
      })
    }

    // If we have a sheet but no access token, return empty
    if (!accessToken) {
      return res.status(200).json({ 
        invoices: [], 
        message: 'Access token required to fetch sheet data' 
      })
    }

    // Use the user's access token
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth })

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
    return res.status(200).json({ 
      invoices: [], 
      error: error.message 
    })
  }
}