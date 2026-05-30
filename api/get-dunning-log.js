// api/get-dunning-log.js
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hiltlozttngjthpudyea.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { businessId, accessToken } = req.query

  if (!businessId) {
    return res.status(400).json({ error: 'Business ID required' })
  }

  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('spreadsheet_id')
      .eq('id', businessId)
      .single()

    if (!business?.spreadsheet_id || !accessToken) {
      return res.status(200).json({ logs: [] })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: business.spreadsheet_id,
      range: 'Dunning Log!A:G',
    })

    const rows = response.data.values || []
    
    if (rows.length <= 1) {
      return res.status(200).json({ logs: [] })
    }

    const headers = rows[0]
    const logs = rows.slice(1).map(row => {
      const log = {}
      headers.forEach((header, index) => {
        log[header] = row[index] || ''
      })
      return log
    })

    return res.status(200).json({ logs })

  } catch (error) {
    console.error('Get dunning log error:', error)
    return res.status(200).json({ logs: [] })
  }
}