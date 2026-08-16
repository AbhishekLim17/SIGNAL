import { api } from './api.js';

const campaignSelect = document.getElementById('draftCampaignSelect');
const generateBtn = document.getElementById('generateDraftsBtn');
const draftStatus = document.getElementById('draftStatus');
const progressFill = document.getElementById('draftProgressFill');
const refreshBtn = document.getElementById('refreshDraftsBtn');
const listEl = document.getElementById('draftsList');

let pollTimer = null;

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadCampaignOptions() {
  const campaigns = await api.listCampaigns();
  campaignSelect.innerHTML = campaigns.map((c) => `<option value="${c.id}">${escapeHtml(c.senderName)} — ${escapeHtml(c.purpose).slice(0, 40)}</option>`).join('');
}

async function loadDrafts() {
  const contacts = await api.listContacts();
  const withDrafts = contacts.filter((c) => c.draft);
  listEl.innerHTML = withDrafts.map((c) => `
    <div class="draft-item" data-id="${c.id}">
      <div class="draft-item-header">
        <div class="draft-meta"><strong>${escapeHtml(c.name || c.email)}</strong> — ${escapeHtml(c.email)} ${c.company ? `· ${escapeHtml(c.company)}` : ''}</div>
        <span class="pill pill-${c.status}">${c.status}</span>
      </div>
      <input type="text" class="draft-subject" value="${escapeHtml(c.draft.subject)}" />
      <textarea class="draft-body">${escapeHtml(c.draft.body)}</textarea>
      <div class="draft-actions">
        <button class="btn-small" data-action="save">Save edit</button>
        <button class="btn-small btn-approve" data-action="approve">Approve</button>
        <button class="btn-small btn-reject" data-action="reject">Reject</button>
      </div>
    </div>
  `).join('') || '<p class="hint">No drafts yet — generate some above.</p>';
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const item = btn.closest('.draft-item');
  const id = item.dataset.id;
  const action = btn.dataset.action;
  btn.disabled = true;
  try {
    if (action === 'save') {
      const subject = item.querySelector('.draft-subject').value;
      const body = item.querySelector('.draft-body').value;
      await api.editDraft(id, subject, body);
    } else if (action === 'approve') {
      await api.approveContact(id);
    } else if (action === 'reject') {
      await api.rejectContact(id);
    }
    await loadDrafts();
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
});

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    const status = await api.draftStatus();
    const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;
    progressFill.style.width = `${pct}%`;
    draftStatus.textContent = status.running
      ? `Generating ${status.done}/${status.total}…`
      : `Done: ${status.done}/${status.total} generated (${status.failed} used fallback template).`;
    if (!status.running) {
      stopPolling();
      await loadDrafts();
    }
  }, 1500);
}

generateBtn.addEventListener('click', async () => {
  const campaignId = campaignSelect.value;
  if (!campaignId) {
    draftStatus.textContent = 'Save a campaign first.';
    return;
  }
  generateBtn.disabled = true;
  progressFill.style.width = '0%';
  draftStatus.textContent = 'Starting…';
  try {
    await api.generateDrafts(campaignId);
    startPolling();
  } catch (err) {
    draftStatus.textContent = `Error: ${err.message}`;
  } finally {
    generateBtn.disabled = false;
  }
});

refreshBtn.addEventListener('click', loadDrafts);
document.addEventListener('campaigns-updated', loadCampaignOptions);

export function initDraftsView() {
  loadCampaignOptions();
  loadDrafts();
}
