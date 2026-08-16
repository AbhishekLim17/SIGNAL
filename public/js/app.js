import { api } from './api.js';
import { initScrapeView } from './scrapeView.js';
import { initCampaignView } from './campaignView.js';
import { initDraftsView } from './draftsView.js';
import { initSendView } from './sendView.js';
import { initAccountsView } from './accountsView.js';
import { initAdminView } from './adminView.js';

let currentUser = null;

const initializers = {
  scrape: initScrapeView,
  campaign: initCampaignView,
  drafts: initDraftsView,
  send: initSendView,
  accounts: initAccountsView,
  admin: () => initAdminView(currentUser.id),
};

const initialized = new Set();
// Views that should re-run their loader each time they're shown (live data).
const alwaysRefresh = new Set(['drafts', 'send', 'accounts', 'admin']);

function activate(viewName) {
  document.querySelectorAll('.segment').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${viewName}`);
  });
  if (!initialized.has(viewName)) {
    initializers[viewName]();
    initialized.add(viewName);
  } else if (alwaysRefresh.has(viewName)) {
    initializers[viewName]();
  }
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.segment');
  if (!btn) return;
  activate(btn.dataset.view);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await api.logout();
  } finally {
    window.location.href = '/login.html';
  }
});

async function boot() {
  try {
    currentUser = await api.me();
  } catch {
    window.location.href = '/login.html';
    return;
  }
  document.getElementById('userEmail').textContent = currentUser.email;
  if (currentUser.role === 'admin') {
    document.getElementById('adminBadge').hidden = false;
    document.getElementById('adminTab').hidden = false;
  }
  activate('scrape');
}

boot();
