import { api } from './api.js';

const fileEl = document.getElementById('importFile');
const uploadBtn = document.getElementById('importUploadBtn');
const importStatus = document.getElementById('importStatus');
const mappingBox = document.getElementById('importMapping');
const mappingGrid = document.getElementById('mappingGrid');
const commitBtn = document.getElementById('importCommitBtn');
const commitStatus = document.getElementById('importCommitStatus');

let parsedRows = [];

function fillSelect(select, columns, selected, includeNone) {
  const opts = [];
  if (includeNone) opts.push('<option value="">— none —</option>');
  for (const c of columns) {
    const isSel = c === selected ? ' selected' : '';
    opts.push(`<option value="${c.replace(/"/g, '&quot;')}"${isSel}>${c}</option>`);
  }
  select.innerHTML = opts.join('');
}

function buildMapping(columns, suggested) {
  mappingGrid.querySelectorAll('select').forEach((select) => {
    const field = select.dataset.field;
    fillSelect(select, columns, suggested[field] || '', field !== 'email');
  });
}

function readMapping() {
  const mapping = {};
  mappingGrid.querySelectorAll('select').forEach((select) => {
    mapping[select.dataset.field] = select.value;
  });
  return mapping;
}

uploadBtn.addEventListener('click', async () => {
  const file = fileEl.files[0];
  if (!file) {
    importStatus.textContent = 'Choose a CSV or Excel file first.';
    return;
  }
  uploadBtn.disabled = true;
  importStatus.textContent = 'Reading file…';
  mappingBox.hidden = true;
  try {
    const { columns, rows, rowCount, suggestedMapping } = await api.importPreview(file);
    parsedRows = rows;
    buildMapping(columns, suggestedMapping);
    mappingBox.hidden = false;
    importStatus.textContent = `Found ${rowCount} row(s) and ${columns.length} column(s). Confirm the mapping below.`;
  } catch (err) {
    importStatus.textContent = `Error: ${err.message}`;
  } finally {
    uploadBtn.disabled = false;
  }
});

commitBtn.addEventListener('click', async () => {
  const mapping = readMapping();
  if (!mapping.email) {
    commitStatus.textContent = 'Pick which column holds the email address.';
    return;
  }
  commitBtn.disabled = true;
  commitStatus.textContent = 'Importing…';
  try {
    const result = await api.importCommit(parsedRows, mapping);
    commitStatus.textContent = `Added ${result.added}, merged ${result.merged}, invalid/skipped ${result.invalid}.`;
    document.dispatchEvent(new CustomEvent('contacts-updated'));
  } catch (err) {
    commitStatus.textContent = `Error: ${err.message}`;
  } finally {
    commitBtn.disabled = false;
  }
});

export function initImportView() {
  // No initial load needed; wired via DOM events.
}
