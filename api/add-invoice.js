// api/add-invoice.js
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hiltlozttngjthpudyea.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { customerName, customerEmail, itemDescription, amount, dueDate, businessId, accessToken } = req.body

  if (!businessId || !accessToken) {
    return res.status(400).json({ error: 'Missing businessId or accessToken' })
  }

  try {
    // Get business's spreadsheet ID
    const { data: business } = await supabase
      .from('businesses')
      .select('spreadsheet_id')
      .eq('id', businessId)
      .single()

    if (!business?.spreadsheet_id) {
      return res.status(404).json({ error: 'Spreadsheet not found for this business' })
    }

    // Use the user's access token
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth })

    const invoiceNumber = `INV-${Date.now()}`
    const issueDate = new Date().toISOString().split('T')[0]

    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId: business.spreadsheet_id,
      range: 'Invoices!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          customerName,
          customerEmail,
          invoiceNumber,
          itemDescription,
          amount,
          issueDate,
          dueDate,
          'Not Due',
          '',
          '',
          ''
        ]],
      },
    })

    return res.status(200).json({ success: true, invoiceNumber })

  } catch (error) {
    console.error('Add invoice error:', error)
    return res.status(500).json({ error: error.message })
  }
}