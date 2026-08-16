import { api } from './api.js';

const saveBtn = document.getElementById('saveCampaignBtn');
const campaignStatus = document.getElementById('campaignStatus');
const tbody = document.querySelector('#campaignsTable tbody');

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadCampaigns() {
  const campaigns = await api.listCampaigns();
  tbody.innerHTML = campaigns.map((c) => `
    <tr>
      <td>${escapeHtml(c.senderName)}</td>
      <td>${escapeHtml(c.purpose)}</td>
      <td>${escapeHtml(c.tone)}</td>
      <td>${new Date(c.createdAt).toLocaleString()}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="hint">No campaigns yet.</td></tr>';
  return campaigns;
}

saveBtn.addEventListener('click', async () => {
  const fields = {
    senderName: document.getElementById('senderName').value.trim(),
    senderTitle: document.getElementById('senderTitle').value.trim(),
    senderCompany: document.getElementById('senderCompany').value.trim(),
    senderReplyEmail: document.getElementById('senderReplyEmail').value.trim(),
    purpose: document.getElementById('purpose').value.trim(),
    tone: document.getElementById('tone').value,
    keyPoints: document.getElementById('keyPoints').value.split('\n').map((s) => s.trim()).filter(Boolean),
    callToAction: document.getElementById('callToAction').value.trim(),
  };
  if (!fields.senderName || !fields.purpose) {
    campaignStatus.textContent = 'Your name and purpose are required.';
    return;
  }
  saveBtn.disabled = true;
  campaignStatus.textContent = 'Saving…';
  try {
    await api.createCampaign(fields);
    campaignStatus.textContent = 'Saved.';
    await loadCampaigns();
    document.dispatchEvent(new CustomEvent('campaigns-updated'));
  } catch (err) {
    campaignStatus.textContent = `Error: ${err.message}`;
  } finally {
    saveBtn.disabled = false;
  }
});

export function initCampaignView() {
  loadCampaigns();
}

export { loadCampaigns };
