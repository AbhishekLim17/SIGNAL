import { api } from './api.js';

const providerEl = document.getElementById('accProvider');
const customFields = document.getElementById('customFields');
const testBtn = document.getElementById('accTestBtn');
const saveBtn = document.getElementById('accSaveBtn');
const status = document.getElementById('accStatus');
const refreshBtn = document.getElementById('refreshAccountsBtn');
const listEl = document.getElementById('accountsList');

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

providerEl.addEventListener('change', () => {
  customFields.hidden = providerEl.value !== 'custom';
});

function readFields() {
  const provider = providerEl.value;
  const fields = {
    label: document.getElementById('accLabel').value.trim(),
    provider,
    user: document.getElementById('accUser').value.trim(),
    pass: document.getElementById('accPass').value,
  };
  if (provider === 'custom') {
    fields.host = document.getElementById('accHost').value.trim();
    fields.port = document.getElementById('accPort').value.trim();
    fields.secure = document.getElementById('accSecure').value;
  }
  return fields;
}

async function loadAccounts() {
  const accounts = await api.listAccounts();
  listEl.innerHTML = accounts.map((a) => `
    <div class="account-item" data-id="${a.id}">
      <div class="acc-meta">
        <strong>${escapeHtml(a.label)}</strong>
        <span class="acc-sub">${escapeHtml(a.email)} · ${a.provider === 'gmail' ? 'Gmail' : escapeHtml(a.host || 'custom SMTP')}</span>
      </div>
      <button class="btn-small btn-reject" data-action="delete">Remove</button>
    </div>
  `).join('') || '<p class="hint">No sending accounts yet. Add one above to be able to send.</p>';
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="delete"]');
  if (!btn) return;
  const id = btn.closest('.account-item').dataset.id;
  btn.disabled = true;
  try {
    await api.deleteAccount(id);
    await loadAccounts();
    document.dispatchEvent(new CustomEvent('accounts-updated'));
  } catch (err) {
    alert(`Error: ${err.message}`);
    btn.disabled = false;
  }
});

testBtn.addEventListener('click', async () => {
  status.textContent = 'Testing connection…';
  try {
    await api.testAccount(readFields());
    status.textContent = '✓ Connection works.';
  } catch (err) {
    status.textContent = `✗ ${err.message}`;
  }
});

saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true;
  status.textContent = 'Testing & saving…';
  try {
    await api.createAccount(readFields());
    status.textContent = '✓ Account added.';
    document.getElementById('accPass').value = '';
    await loadAccounts();
    document.dispatchEvent(new CustomEvent('accounts-updated'));
  } catch (err) {
    status.textContent = `✗ ${err.message}`;
  } finally {
    saveBtn.disabled = false;
  }
});

refreshBtn.addEventListener('click', loadAccounts);

export function initAccountsView() {
  loadAccounts();
}
