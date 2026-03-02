/* =============================================
   CS Ticket Tracker — Shared Utilities
   ============================================= */

const STORAGE_KEY = 'cs_tickets';
const COUNTER_KEY = 'cs_ticket_counter';

/* --- Ticket Storage --- */

function getAllTickets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAllTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function getNextTicketId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(counter));
  return 'TKT-' + String(counter).padStart(3, '0');
}

function addTicket(ticketData) {
  const tickets = getAllTickets();
  const ticket = {
    id: getNextTicketId(),
    createdAt: new Date().toISOString(),
    ...ticketData,
  };
  tickets.push(ticket);
  saveAllTickets(tickets);
  return ticket;
}

function updateTicket(id, updates) {
  const tickets = getAllTickets();
  const idx = tickets.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tickets[idx] = { ...tickets[idx], ...updates, updatedAt: new Date().toISOString() };
  saveAllTickets(tickets);
  return tickets[idx];
}

function deleteTicket(id) {
  const tickets = getAllTickets().filter(t => t.id !== id);
  saveAllTickets(tickets);
}

function getTicketById(id) {
  return getAllTickets().find(t => t.id === id) || null;
}

/* --- Status Badge Helper --- */

function statusBadgeClass(status) {
  const map = {
    'Open': 'badge-open',
    'In Progress': 'badge-inprogress',
    'Pending Customer': 'badge-pending',
    'Resolved': 'badge-resolved',
    'Closed': 'badge-closed',
  };
  return map[status] || 'badge-closed';
}

/* --- Date Formatting --- */

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${m}/${d}/${y}`;
}

/* --- Set active nav link --- */

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
