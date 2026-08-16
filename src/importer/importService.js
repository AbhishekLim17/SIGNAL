import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { upsertContact } from '../db/contactsRepo.js';
import { isValidEmail } from '../utils/validators.js';

function cellText(cell) {
  const v = cell?.value;
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if (v.hyperlink != null) return String(v.hyperlink);
    return '';
  }
  return String(v);
}

function dedupeHeaders(headers) {
  const seen = new Map();
  return headers.map((h) => {
    if (!seen.has(h)) {
      seen.set(h, 0);
      return h;
    }
    const n = seen.get(h) + 1;
    seen.set(h, n);
    return `${h} (${n})`;
  });
}

/**
 * Parses an uploaded .csv/.xlsx/.xls buffer into { columns, rows } where each
 * row is an object keyed by column header.
 */
export async function parseBuffer(buffer, filename) {
  const workbook = new ExcelJS.Workbook();
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.csv')) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer);
  }

  const ws = workbook.worksheets[0];
  if (!ws || ws.rowCount < 1) return { columns: [], rows: [] };

  const width = ws.columnCount;
  const headerRow = ws.getRow(1);
  const rawHeaders = [];
  for (let i = 1; i <= width; i++) {
    rawHeaders.push(cellText(headerRow.getCell(i)).trim() || `Column ${i}`);
  }
  const columns = dedupeHeaders(rawHeaders);

  const rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj = {};
    let hasData = false;
    for (let i = 1; i <= width; i++) {
      const t = cellText(row.getCell(i)).trim();
      obj[columns[i - 1]] = t;
      if (t) hasData = true;
    }
    if (hasData) rows.push(obj);
  }

  return { columns, rows };
}

function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pick(columns, exact, contains) {
  for (const c of columns) {
    if (exact.includes(normalizeHeader(c))) return c;
  }
  for (const c of columns) {
    if (contains.some((p) => normalizeHeader(c).includes(p))) return c;
  }
  return '';
}

/**
 * Best-guess mapping of spreadsheet columns to contact fields based on header
 * names. The user can override any of these in the UI before importing.
 */
export function suggestMapping(columns) {
  const email = pick(columns, ['email', 'emailaddress', 'emailid', 'mail'], ['email', 'mail']);
  const company = pick(
    columns,
    ['company', 'companyname', 'organization', 'organisation', 'business', 'firm', 'account'],
    ['company', 'organi', 'business', 'firm']
  );
  // Guess "name" but avoid columns that are really company/file/user names.
  const nameExact = pick(columns, ['name', 'fullname', 'contactname', 'contact', 'contactperson', 'person'], []);
  const nameContains = columns.find(
    (c) => normalizeHeader(c).includes('name') && !/(company|organi|business|firm|file|user|domain)/.test(normalizeHeader(c))
  );
  const name = nameExact || nameContains || '';
  const title = pick(
    columns,
    ['title', 'jobtitle', 'position', 'role', 'designation'],
    ['jobtitle', 'position', 'role', 'designation']
  );
  const phone = pick(
    columns,
    ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'telephone', 'tel', 'cell', 'contactnumber'],
    ['phone', 'mobile', 'tel', 'cell']
  );
  return { email, name, company, title, phone };
}

function clean(value) {
  if (value == null) return null;
  const trimmed = String(value).replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Creates/merges contacts from parsed rows using the user's column mapping.
 * Columns not mapped to a standard field are carried into rawTextSnippet so the
 * LLM can use them as personalization context ("carry what we need").
 */
export async function commitImport(userId, rows, mapping) {
  const result = { added: 0, merged: 0, skipped: 0, invalid: 0 };
  if (!Array.isArray(rows)) return result;

  const mappedCols = new Set(Object.values(mapping).filter(Boolean));

  for (const row of rows) {
    const email = clean(row[mapping.email]);
    if (!isValidEmail(email || '')) {
      result.invalid += 1;
      continue;
    }

    const extraParts = Object.keys(row)
      .filter((k) => !mappedCols.has(k) && clean(row[k]))
      .map((k) => `${k}: ${clean(row[k])}`);
    const rawTextSnippet = extraParts.join('; ').slice(0, 300);

    const scraped = {
      email,
      name: mapping.name ? clean(row[mapping.name]) : null,
      company: mapping.company ? clean(row[mapping.company]) : null,
      title: mapping.title ? clean(row[mapping.title]) : null,
      phone: mapping.phone ? clean(row[mapping.phone]) : null,
      sourceUrl: 'imported',
      rawTextSnippet,
    };

    const { created } = await upsertContact(userId, scraped);
    if (created) result.added += 1;
    else result.merged += 1;
  }

  return result;
}
