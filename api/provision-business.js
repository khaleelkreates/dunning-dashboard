// api/provision-business.js
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hiltlozttngjthpudyea.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEMPLATE_SCRIPT_ID = process.env.APPS_SCRIPT_TEMPLATE_ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { businessId, businessName, ownerEmail, accessToken, refreshToken } = req.body

  if (!businessId || !accessToken) {
    return res.status(400).json({ error: 'Missing businessId or accessToken' })
  }

  try {
    // Check if business already has a spreadsheet
    const { data: existing } = await supabase
      .from('businesses')
      .select('spreadsheet_id, script_id')
      .eq('id', businessId)
      .single()

    if (existing?.spreadsheet_id && existing?.script_id) {
      return res.status(200).json({ 
        success: true, 
        spreadsheetId: existing.spreadsheet_id,
        scriptId: existing.script_id
      })
    }

    // Use the user's access token (not service account)
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    // 1. Create spreadsheet
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

    // 2. Add headers to Invoices sheet
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

    // 3. Add default settings
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

    // 4. Copy Apps Script template
    const scriptId = await copyAppsScriptTemplate(accessToken, businessName, spreadsheetId, refreshToken)

    // 5. Deploy the script
    const deploymentId = await deployAppsScript(accessToken, scriptId)

    // 6. Create time trigger
    await createTimeTrigger(accessToken, scriptId)

    // 7. Update Supabase
    await supabase
      .from('businesses')
      .update({ 
        spreadsheet_id: spreadsheetId,
        script_id: scriptId,
        script_deployment_id: deploymentId
      })
      .eq('id', businessId)

    return res.status(200).json({ 
      success: true, 
      spreadsheetId,
      scriptId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    })

  } catch (error) {
    console.error('Provision error:', error)
    return res.status(500).json({ error: error.message })
  }
}

async function copyAppsScriptTemplate(accessToken, businessName, spreadsheetId, refreshToken) {
  // First, get the template content
  const templateResponse = await fetch(`https://script.googleapis.com/v1/projects/${TEMPLATE_SCRIPT_ID}/content`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  
  const templateData = await templateResponse.json()
  let scriptContent = templateData.files[0].source
  
  // Replace placeholders with actual values
  scriptContent = scriptContent.replace(/{{SPREADSHEET_ID}}/g, spreadsheetId)
  scriptContent = scriptContent.replace(/{{BUSINESS_NAME}}/g, businessName)
  scriptContent = scriptContent.replace(/{{REFRESH_TOKEN}}/g, refreshToken || '')
  scriptContent = scriptContent.replace(/{{GOOGLE_CLIENT_ID}}/g, GOOGLE_CLIENT_ID)
  scriptContent = scriptContent.replace(/{{GOOGLE_CLIENT_SECRET}}/g, GOOGLE_CLIENT_SECRET)
  
  // Copy the template
  const copyResponse = await fetch(`https://script.googleapis.com/v1/projects/${TEMPLATE_SCRIPT_ID}/copy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `Dunning_Script_${businessName.replace(/\s/g, '_')}_${Date.now()}`
    })
  })
  
  const copyData = await copyResponse.json()
  const newScriptId = copyData.scriptId
  
  // Update the copied script with replaced content
  await fetch(`https://script.googleapis.com/v1/projects/${newScriptId}/content`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: [{
        name: 'Code',
        type: 'SERVER_JS',
        source: scriptContent
      }]
    })
  })
  
  return newScriptId
}

async function deployAppsScript(accessToken, scriptId) {
  // Create a new version
  const versionResponse = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: 'Initial deployment for dunning automation'
    })
  })
  
  const versionData = await versionResponse.json()
  const versionNumber = versionData.versionNumber
  
  // Create deployment
  const deployResponse = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      versionNumber: versionNumber,
      manifest: {
        webapp: {
          executeAs: 'USER_ACCESSING',
          access: 'ANYONE'
        }
      }
    })
  })
  
  const deployData = await deployResponse.json()
  return deployData.deploymentId
}

async function createTimeTrigger(accessToken, scriptId) {
  await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/triggers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      function: 'processOverdueInvoices',
      triggerSource: 'CLOCK',
      triggerSourceType: 'SCHEDULE',
      schedule: {
        minute: '*/10',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*'
      }
    })
  })
}