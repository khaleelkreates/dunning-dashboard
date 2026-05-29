/* eslint-disable */
// @ts-nocheck
// api/provision-business.js
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')
const { JWT } = require('google-auth-library')

const supabase = createClient(
  'https://hiltlozttngjthpudyea.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY
  if (!key) return undefined
  return key.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { businessId, businessName, ownerEmail, refreshToken } = req.body

  if (!businessId) {
    return res.status(400).json({ error: 'Business ID required' })
  }

  try {
    const { data: existing } = await supabase
      .from('businesses')
      .select('spreadsheet_id')
      .eq('id', businessId)
      .single()

    if (existing?.spreadsheet_id) {
      return res.status(200).json({ 
        success: true, 
        spreadsheetId: existing.spreadsheet_id,
        message: 'Spreadsheet already exists' 
      })
    }

    const client = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: getPrivateKey(),
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth: client })
    const drive = google.drive({ version: 'v3', auth: client })

    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { 
          title: `Dunning_${businessName?.replace(/\s/g, '_') || 'Business'}_${Date.now()}` 
        },
        sheets: [
          { properties: { title: 'Invoices', gridProperties: { rowCount: 1000, columnCount: 11 } } },
          { properties: { title: 'Settings', gridProperties: { rowCount: 50, columnCount: 2 } } },
          { properties: { title: 'Dunning Log', gridProperties: { rowCount: 1000, columnCount: 7 } } },
        ],
      },
    })

    const spreadsheetId = spreadsheet.data.spreadsheetId

    // Move to folder (try-catch in case folder doesn't exist)
    try {
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: '1EPM9HfP_t9NzgMjReq3xfm30LKbEcf6C',
        removeParents: 'root',
        fields: 'id, parents',
        supportsAllDrives: true,
      })
    } catch (folderError) {
      console.log('Folder move failed, continuing anyway:', folderError.message)
    }

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Invoices!A1:K1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'Customer Name', 'Customer Email', 'Invoice Number', 'Item Description', 
          'Amount (₦)', 'Issue Date', 'Due Date', 'Status', 'Last Follow-up Date', 'Notes', 'Last Email Sent Date'
        ]],
      },
    })

    // Add default settings
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Settings!A1:B9',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['Setting', 'Value'],
          ['Enable Dunning', 'TRUE'],
          ['Exempt Statuses (comma)', 'Paid'],
          ['Exempt Notes Keywords (comma)', 'exempt,hold,test'],
          ['Minimum Days Overdue to Act', '1'],
          ['Send Real Emails? (TRUE/FALSE)', 'TRUE'],
          ['Business Name (for email signature)', businessName || 'My Business'],
          ['Reminder Interval (days)', '3'],
          ['Overdue Threshold (days)', '7'],
        ],
      },
    })

    // Transfer ownership to business owner
    if (ownerEmail) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'user',
            role: 'owner',
            emailAddress: ownerEmail,
          },
          transferOwnership: true,
          supportsAllDrives: true,
        })
      } catch (shareError) {
        console.log('Ownership transfer failed:', shareError.message)
      }
    }

    // Update Supabase
    await supabase
      .from('businesses')
      .update({ 
        spreadsheet_id: spreadsheetId,
        google_refresh_token: refreshToken || null,
      })
      .eq('id', businessId)

    return res.status(200).json({ 
      success: true, 
      spreadsheetId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    })

  } catch (error) {
    console.error('Provision error:', error)
    return res.status(500).json({ error: error.message })
  }
}