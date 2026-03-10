// =============================================================================
//  CS Ticket Tracker — Google Apps Script Backend
//  Paste this entire file into script.google.com, then deploy as a web app:
//    Execute as: Me
//    Who has access: Anyone
// =============================================================================

const SHEET_NAME = 'Tickets';

// Column order must match the header row you created in the sheet exactly.
const COLUMNS = [
  'id', 'createdAt', 'updatedAt', 'dateOfTicket', 'repName',
  'channel', 'customerUsername', 'orderNumber', 'orderDate',
  'issueCategory', 'issue', 'responseStatus', 'lastContacted',
  'resolutionType', 'totalResolutionTime', 'notes'
];

// ── Handle GET requests (read all tickets) ────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter || {}).action;
    if (action === 'getAll') return respond(getAll());
    return respond({ error: 'Unknown GET action: ' + action });
  } catch (err) {
    return respond({ error: err.message });
  }
}

// ── Handle POST requests (create / update / delete / import) ──────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'add')             return respond(addTicket(body.ticket));
    if (body.action === 'update')          return respond(updateTicket(body.id, body.updates));
    if (body.action === 'delete')          return respond(deleteTicket(body.id));
    if (body.action === 'importFromSheet') return respond(importFromSheet(body.sheetId, body.sheetName || ''));
    if (body.action === 'clearAll')        return respond(clearAllTickets());
    return respond({ error: 'Unknown POST action: ' + body.action });
  } catch (err) {
    return respond({ error: err.message });
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function rowToObj(row) {
  const obj = {};
  COLUMNS.forEach((col, i) => {
    const val = row[i];
    if (val instanceof Date) {
      obj[col] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      obj[col] = (val !== undefined && val !== null) ? String(val) : '';
    }
  });
  // Normalize legacy "Yes" / "yes" values entered directly in the sheet
  if (obj.responseStatus && obj.responseStatus.toLowerCase() === 'yes') {
    obj.responseStatus = 'Resolved';
  }
  return obj;
}

function objToRow(obj) {
  return COLUMNS.map(col => obj[col] || '');
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function nextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'TKT-001';
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  let max = 0;
  ids.forEach(id => {
    const m = String(id).match(/TKT-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'TKT-' + String(max + 1).padStart(3, '0');
}

// ── CRUD operations ───────────────────────────────────────────────────────────

function getAll() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { tickets: [] };
  const rows = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  const tickets = rows.map(rowToObj).filter(t => t.id && t.id.trim());
  return { tickets };
}

function addTicket(data) {
  const sheet = getSheet();
  const now = new Date().toISOString();
  const ticket = Object.assign({}, data, {
    id: nextId(sheet),
    createdAt: now,
    updatedAt: now,
  });
  sheet.appendRow(objToRow(ticket));
  return { success: true, ticket };
}

function updateTicket(id, updates) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'Ticket not found' };
  const rows = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      const existing = rowToObj(rows[i]);
      const updated = Object.assign({}, existing, updates, { updatedAt: new Date().toISOString() });
      sheet.getRange(i + 2, 1, 1, COLUMNS.length).setValues([objToRow(updated)]);
      return { success: true, ticket: updated };
    }
  }
  return { error: 'Ticket not found' };
}

// ── Import from old Google Sheet ──────────────────────────────────────────────
// Old sheet columns (case-insensitive) mapped to new ticket fields:
//   Customer Rep → repName, Channel → channel, Customer Username → customerUsername,
//   Issue → issue, Response Status → responseStatus, Last contacted → lastContacted,
//   Issue category → issueCategory, Resolved → resolutionType, Notes → notes

const OLD_COLUMN_MAP = {
  'customer rep':      'repName',
  'channel':           'channel',
  'customer username': 'customerUsername',
  'date of ticket':    'dateOfTicket',
  'issue':             'issue',
  'response status':   'responseStatus',
  'last contacted':    'lastContacted',
  'issue category':    'issueCategory',
  'resolved':          'resolutionType',
  'notes':             'notes',
};

function importFromSheet(sheetId, sheetName) {
  let ss;
  try {
    ss = SpreadsheetApp.openById(sheetId);
  } catch (e) {
    return { error: 'Could not open spreadsheet. Make sure the Sheet ID is correct and the sheet is shared with your Google account.' };
  }

  const sourceSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sourceSheet) return { error: 'Tab "' + sheetName + '" not found in the spreadsheet.' };

  const lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) return { imported: 0 };

  const allData = sourceSheet.getDataRange().getValues();
  const headers = allData[0].map(h => String(h).trim().toLowerCase());

  // Build index map: field name → column index in source sheet
  const fieldIndex = {};
  headers.forEach((h, i) => {
    const field = OLD_COLUMN_MAP[h];
    if (field) fieldIndex[field] = i;
  });

  const targetSheet = getSheet();
  const now = new Date().toISOString();
  let importedCount = 0;

  for (let r = 1; r < allData.length; r++) {
    const row = allData[r];
    if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;

    const ticket = {
      dateOfTicket: '', orderNumber: '', orderDate: '', totalResolutionTime: '',
    };

    Object.entries(fieldIndex).forEach(([field, idx]) => {
      const val = row[idx];
      if (val instanceof Date) {
        ticket[field] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else {
        ticket[field] = (val !== undefined && val !== null) ? String(val) : '';
      }
    });

    // Normalize legacy "Yes"/"No" in responseStatus
    if (ticket.responseStatus && ticket.responseStatus.toLowerCase() === 'yes') {
      ticket.responseStatus = 'Resolved';
    }

    const fullTicket = Object.assign(ticket, {
      id:        nextId(targetSheet),
      createdAt: now,
      updatedAt: now,
    });

    targetSheet.appendRow(objToRow(fullTicket));
    importedCount++;
  }

  return { imported: importedCount };
}

function clearAllTickets() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { cleared: 0 };
  const count = lastRow - 1;
  sheet.deleteRows(2, count);
  return { cleared: count };
}

function deleteTicket(id) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'Ticket not found' };
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i]) === id) {
      sheet.deleteRow(i + 2);
      return { success: true };
    }
  }
  return { error: 'Ticket not found' };
}
