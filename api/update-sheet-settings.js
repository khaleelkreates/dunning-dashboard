// api/update-sheet-settings.js
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

  const { businessId, accessToken, settings } = req.body

  if (!businessId || !accessToken) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('spreadsheet_id')
      .eq('id', businessId)
      .single()

    if (!business?.spreadsheet_id) {
      return res.status(404).json({ error: 'Spreadsheet not found' })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth })

    // Update settings in the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: business.spreadsheet_id,
      range: 'Settings!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['Reminder Interval (days)', settings.reminderInterval.toString()],
          ['Overdue Threshold (days)', settings.overdueThreshold.toString()],
          ['Use AI Reminders?', settings.useAI ? 'TRUE' : 'FALSE'],
        ],
      },
    })

    return res.status(200).json({ success: true })

  } catch (error) {
    console.error('Update sheet settings error:', error)
    return res.status(500).json({ error: error.message })
  }
}