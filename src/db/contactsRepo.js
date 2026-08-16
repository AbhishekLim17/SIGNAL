import { randomUUID } from 'node:crypto';
import { getDb, persist } from './db.js';

function now() {
  return new Date().toISOString();
}

function emptyContact(userId, email) {
  const ts = now();
  return {
    id: randomUUID(),
    userId,
    email: email.toLowerCase().trim(),
    name: null,
    company: null,
    title: null,
    phone: null,
    sourceUrls: [],
    rawTextSnippet: '',
    status: 'scraped',
    campaignId: null,
    draft: null,
    draftEditedManually: false,
    flags: { incomplete: false, missingFields: [] },
    sendMeta: { attempts: 0, lastAttemptAt: null, sentAt: null, error: null },
    createdAt: ts,
    updatedAt: ts,
  };
}

function computeFlags(contact) {
  const missingFields = ['name', 'company', 'title', 'phone'].filter((f) => !contact[f]);
  return { incomplete: missingFields.length > 0, missingFields };
}

export async function listContacts(userId, { status, campaignId } = {}) {
  const db = await getDb();
  return db.data.contacts.filter((c) => {
    if (c.userId !== userId) return false;
    if (status && c.status !== status) return false;
    if (campaignId && c.campaignId !== campaignId) return false;
    return true;
  });
}

export async function getContact(userId, id) {
  const db = await getDb();
  return db.data.contacts.find((c) => c.id === id && c.userId === userId) || null;
}

/**
 * Insert a new contact, or merge extracted fields into an existing one (same
 * user + email) without ever overwriting a manually-edited field.
 */
export async function upsertContact(userId, scraped) {
  const db = await getDb();
  const email = scraped.email.toLowerCase().trim();
  const existing = db.data.contacts.find((c) => c.userId === userId && c.email === email);

  if (!existing) {
    const contact = emptyContact(userId, email);
    contact.name = scraped.name || null;
    contact.company = scraped.company || null;
    contact.title = scraped.title || null;
    contact.phone = scraped.phone || null;
    contact.sourceUrls = scraped.sourceUrl ? [scraped.sourceUrl] : [];
    contact.rawTextSnippet = scraped.rawTextSnippet || '';
    contact.flags = computeFlags(contact);
    db.data.contacts.push(contact);
    await persist(db);
    return { contact, created: true };
  }

  if (scraped.sourceUrl && !existing.sourceUrls.includes(scraped.sourceUrl)) {
    existing.sourceUrls.push(scraped.sourceUrl);
  }
  for (const field of ['name', 'company', 'title', 'phone']) {
    if (!existing[field] && scraped[field]) existing[field] = scraped[field];
  }
  if (!existing.rawTextSnippet && scraped.rawTextSnippet) {
    existing.rawTextSnippet = scraped.rawTextSnippet;
  }
  existing.flags = computeFlags(existing);
  existing.updatedAt = now();
  await persist(db);
  return { contact: existing, created: false };
}

export async function updateContact(userId, id, patch) {
  const db = await getDb();
  const contact = db.data.contacts.find((c) => c.id === id && c.userId === userId);
  if (!contact) return null;
  Object.assign(contact, patch);
  contact.flags = computeFlags(contact);
  contact.updatedAt = now();
  await persist(db);
  return contact;
}

export async function deleteContact(userId, id) {
  const db = await getDb();
  const before = db.data.contacts.length;
  db.data.contacts = db.data.contacts.filter((c) => !(c.id === id && c.userId === userId));
  await persist(db);
  return db.data.contacts.length < before;
}

export async function setDraft(userId, id, draft) {
  const db = await getDb();
  const contact = db.data.contacts.find((c) => c.id === id && c.userId === userId);
  if (!contact) return null;
  contact.draft = draft;
  contact.status = 'drafted';
  contact.updatedAt = now();
  await persist(db);
  return contact;
}

export async function editDraft(userId, id, { subject, body }) {
  const db = await getDb();
  const contact = db.data.contacts.find((c) => c.id === id && c.userId === userId);
  if (!contact) return null;
  contact.draft = { ...(contact.draft || {}), subject, body };
  contact.draftEditedManually = true;
  contact.updatedAt = now();
  await persist(db);
  return contact;
}

export async function setStatus(userId, id, status) {
  const db = await getDb();
  const contact = db.data.contacts.find((c) => c.id === id && c.userId === userId);
  if (!contact) return null;
  contact.status = status;
  contact.updatedAt = now();
  await persist(db);
  return contact;
}

export async function setSendResult(userId, id, { success, error }) {
  const db = await getDb();
  const contact = db.data.contacts.find((c) => c.id === id && c.userId === userId);
  if (!contact) return null;
  contact.status = success ? 'sent' : 'failed';
  contact.sendMeta.attempts += 1;
  contact.sendMeta.lastAttemptAt = now();
  contact.sendMeta.error = success ? null : error;
  if (success) contact.sendMeta.sentAt = now();
  contact.updatedAt = now();
  await persist(db);
  return contact;
}
