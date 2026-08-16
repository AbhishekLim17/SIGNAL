import { api } from './api.js';
import { initImportView } from './importView.js';

const urlsEl = document.getElementById('scrapeUrls');
const scrapeBtn = document.getElementById('scrapeBtn');
const scrapeStatus = document.getElementById('scrapeStatus');
const refreshBtn = document.getElementById('refreshContactsBtn');
const tbody = document.querySelector('#contactsTable tbody');

function statusPill(status) {
  return `<span class="pill pill-${status}">${status}</span>`;
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadContacts() {
  const contacts = await api.listContacts();
  tbody.innerHTML = contacts.map((c) => `
    <tr>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.name || '—')}</td>
      <td>${escapeHtml(c.company || '—')}</td>
      <td>${escapeHtml(c.title || '—')}</td>
      <td>${escapeHtml(c.phone || '—')}</td>
      <td>${statusPill(c.status)}</td>
      <td></td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="hint">No contacts yet — scrape a URL above.</td></tr>';
}

scrapeBtn.addEventListener('click', async () => {
  const urls = urlsEl.value.split('\n').map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) {
    scrapeStatus.textContent = 'Enter at least one URL.';
    return;
  }
  scrapeBtn.disabled = true;
  scrapeStatus.textContent = 'Scraping…';
  try {
    const result = await api.scrape(urls);
    scrapeStatus.textContent = `Added ${result.added}, merged ${result.merged}, skipped ${result.skipped}${result.errors.length ? `, ${result.errors.length} error(s)` : ''}.`;
    await loadContacts();
  } catch (err) {
    scrapeStatus.textContent = `Error: ${err.message}`;
  } finally {
    scrapeBtn.disabled = false;
  }
});

refreshBtn.addEventListener('click', loadContacts);
document.addEventListener('contacts-updated', loadContacts);

export function initScrapeView() {
  initImportView();
  loadContacts();
}
