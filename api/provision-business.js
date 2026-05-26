// api/provision-business.js
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { businessId, businessName, ownerEmail, refreshToken } = req.body

  if (!businessId || !businessName || !ownerEmail || !refreshToken) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    // 1. Create spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `Dunning_${businessName.replace(/\s/g, '_')}` },
        sheets: [
          { properties: { title: 'Invoices', gridProperties: { rowCount: 1000, columnCount: 11 } } },
          { properties: { title: 'Settings', gridProperties: { rowCount: 50, columnCount: 2 } } },
          { properties: { title: 'Dunning Log', gridProperties: { rowCount: 1000, columnCount: 7 } } },
        ],
      },
    })

    const spreadsheetId = spreadsheet.data.spreadsheetId

    // 2. Add headers to Invoices
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Invoices!A1:K1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Customer Name', 'Customer Email', 'Invoice Number', 'Item Description', 'Amount (₦)', 'Issue Date', 'Due Date', 'Status', 'Last Follow-up Date', 'Notes', 'Last Email Sent Date']],
      },
    })

    // 3. Add default settings
    const defaultSettings = [
      ['Setting', 'Value'],
      ['Enable Dunning', 'TRUE'],
      ['Exempt Statuses (comma)', 'Paid'],
      ['Exempt Notes Keywords (comma)', 'exempt,hold,test'],
      ['Minimum Days Overdue to Act', '1'],
      ['Send Real Emails? (TRUE/FALSE)', 'TRUE'],
      ['Business Name (for email signature)', businessName],
      ['Reminder Interval (days)', '3'],
      ['Overdue Threshold (days)', '7'],
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Settings!A1:B9',
      valueInputOption: 'RAW',
      requestBody: { values: defaultSettings },
    })

    // 4. Share sheet with business owner
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: ownerEmail,
      },
    })

    // 5. Store in Supabase
    await supabase
      .from('businesses')
      .update({
        spreadsheet_id: spreadsheetId,
        google_refresh_token: refreshToken,
      })
      .eq('id', businessId)

    return res.status(200).json({ 
      success: true, 
      spreadsheetId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    })

  } catch (error) {
    console.error('Provision error:', error)
    return res.status(500).json({ error: error.message })
  }
}