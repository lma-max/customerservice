/* =============================================
   CS Ticket Tracker — Google Sheets API Layer
   ============================================= */

const API_URL = 'https://script.google.com/macros/s/AKfycbx2d4scNLsiJJMZ2yZ3A9QrfDGavzx_7nyjzW8cFX5okn2F3nFRp9PdR3LrdbdSp8Zi3g/exec';

/* --- API requests --- */

async function getAllTickets() {
  const res = await fetch(`${API_URL}?action=getAll`, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.tickets || [];
}

async function addTicket(ticketData) {
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'add', ticket: ticketData }),
  });
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.ticket;
}

async function updateTicket(id, updates) {
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'update', id, updates }),
  });
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.ticket;
}

async function importTicketsFromSheet(sheetId, sheetName) {
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'importFromSheet', sheetId, sheetName }),
  });
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function clearAllTickets() {
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'clearAll' }),
  });
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function deleteTicket(id) {
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'delete', id }),
  });
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

/* --- Status Badge Helper --- */

function statusBadgeClass(status) {
  const map = {
    'Open':             'badge-open',
    'In Progress':      'badge-inprogress',
    'Pending Customer': 'badge-pending',
    'Resolved':         'badge-resolved',
    'Closed':           'badge-closed',
  };
  return map[status] || 'badge-closed';
}

/* --- Date Formatting --- */

function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Handles yyyy-MM-dd and ISO strings like 2026-03-03T12:00:00Z
  const isoMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  // Fallback: let the browser parse other formats (e.g. "Mon Mar 03 2026 00:00:00 GMT+0000")
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${m}/${day}/${y}`;
  }
  return dateStr;
}

/* --- Active nav --- */

function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', setActiveNav);
