import { api } from './api.js';

const sendBtn = document.getElementById('sendBtn');
const sendStatusText = document.getElementById('sendStatusText');
const progressFill = document.getElementById('sendProgressFill');
const capHint = document.getElementById('capHint');
const refreshLogBtn = document.getElementById('refreshLogBtn');
const logTbody = document.querySelector('#logTable tbody');
const senderSelect = document.getElementById('senderSelect');

let pollTimer = null;

async function loadSenders() {
  const senders = await api.listSenders();
  const opts = senders.map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`);
  if (senders.length > 1) {
    opts.push('<option value="random">🎲 Random — rotate across all accounts</option>');
  }
  senderSelect.innerHTML = opts.join('') || '<option value="">No accounts configured</option>';
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadLog() {
  const log = await api.sendLog();
  logTbody.innerHTML = log.map((e) => `
    <tr>
      <td>${escapeHtml(e.email)}</td>
      <td>${escapeHtml(e.sender || '—')}</td>
      <td><span class="pill pill-${e.status}">${e.status}</span></td>
      <td>${escapeHtml(e.error || '—')}</td>
      <td>${new Date(e.timestamp).toLocaleString()}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="hint">No sends yet.</td></tr>';
}

async function refreshStatus() {
  const status = await api.sendStatus();
  capHint.textContent = `Remaining today before the daily cap: ${status.dailyCapRemaining}.`;
  const total = status.sentCount + status.failedCount + status.remaining;
  const done = status.sentCount + status.failedCount;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  progressFill.style.width = `${pct}%`;
  sendStatusText.textContent = status.running
    ? `Sending… ${status.sentCount} sent, ${status.failedCount} failed, ${status.remaining} remaining.`
    : status.cappedForToday
      ? `Stopped: daily cap reached. ${status.sentCount} sent, ${status.remaining} remaining for tomorrow.`
      : `Idle. Last run: ${status.sentCount} sent, ${status.failedCount} failed.`;
  return status;
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    const status = await refreshStatus();
    if (!status.running) {
      stopPolling();
      await loadLog();
    }
  }, 2000);
}

sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  progressFill.style.width = '0%';
  sendStatusText.textContent = 'Starting…';
  try {
    await api.send(senderSelect.value);
    startPolling();
  } catch (err) {
    sendStatusText.textContent = `Error: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
  }
});

refreshLogBtn.addEventListener('click', loadLog);

export function initSendView() {
  loadSenders();
  refreshStatus();
  loadLog();
}
