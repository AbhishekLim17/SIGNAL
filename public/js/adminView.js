import { api } from './api.js';

const refreshBtn = document.getElementById('refreshUsersBtn');
const tbody = document.querySelector('#usersTable tbody');

let currentUserId = null;

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadUsers() {
  const users = await api.adminListUsers();
  tbody.innerHTML = users.map((u) => {
    const isSelf = u.id === currentUserId;
    return `
    <tr data-id="${u.id}">
      <td>${escapeHtml(u.email)}${isSelf ? ' <span class="acc-sub">(you)</span>' : ''}</td>
      <td>${u.role}</td>
      <td><span class="pill pill-${u.active ? 'approved' : 'rejected'}">${u.active ? 'active' : 'disabled'}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      <td>${isSelf ? '' : `<button class="btn-small ${u.active ? 'btn-reject' : 'btn-approve'}" data-action="toggle" data-active="${u.active}">${u.active ? 'Deactivate' : 'Activate'}</button>`}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" class="hint">No users.</td></tr>';
}

tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="toggle"]');
  if (!btn) return;
  const id = btn.closest('tr').dataset.id;
  const active = btn.dataset.active === 'true';
  btn.disabled = true;
  try {
    await api.adminUpdateUser(id, { active: !active });
    await loadUsers();
  } catch (err) {
    alert(`Error: ${err.message}`);
    btn.disabled = false;
  }
});

refreshBtn.addEventListener('click', loadUsers);

export function initAdminView(userId) {
  currentUserId = userId;
  loadUsers();
}
