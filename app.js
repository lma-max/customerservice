/**
 * CS Ticket Tracker — Shared Utilities
 * Handles localStorage persistence, ticket ID generation, and shared helpers.
 */

const STORAGE_KEY = 'cs_tickets';
const COUNTER_KEY = 'cs_ticket_counter';

/* ===== localStorage Helpers ===== */

function getTickets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function getNextTicketId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
  const next = counter + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return 'TKT-' + String(next).padStart(3, '0');
}

function getTicketById(id) {
  return getTickets().find(t => t.id === id) || null;
}

function saveTicket(ticket) {
  const tickets = getTickets();
  const idx = tickets.findIndex(t => t.id === ticket.id);
  if (idx >= 0) {
    tickets[idx] = ticket;
  } else {
    tickets.push(ticket);
  }
  saveTickets(tickets);
}

function deleteTicket(id) {
  const tickets = getTickets().filter(t => t.id !== id);
  saveTickets(tickets);
}

/* ===== Date Helpers ===== */

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

/* ===== Status Badge ===== */

function statusBadge(status) {
  const map = {
    'Open':             'badge-open',
    'In Progress':      'badge-inprogress',
    'Pending Customer': 'badge-pending',
    'Resolved':         'badge-resolved',
    'Closed':           'badge-closed',
  };
  const cls = map[status] || 'badge-open';
  return `<span class="badge ${cls}">${escHtml(status)}</span>`;
}

/* ===== HTML Escape ===== */

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== Active Nav Link ===== */

function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', setActiveNav);
