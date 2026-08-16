import { randomUUID } from 'node:crypto';
import { getDb, persist } from './db.js';

function isToday(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export async function appendLog(userId, { contactId, email, status, error, sender }) {
  const db = await getDb();
  const entry = {
    id: randomUUID(),
    userId,
    contactId,
    email,
    status,
    error: error || null,
    sender: sender || null,
    timestamp: new Date().toISOString(),
  };
  db.data.sendLog.push(entry);
  await persist(db);
  return entry;
}

export async function countToday(userId) {
  const db = await getDb();
  return db.data.sendLog.filter((e) => e.userId === userId && e.status === 'sent' && isToday(e.timestamp)).length;
}

export async function getLog(userId) {
  const db = await getDb();
  return db.data.sendLog
    .filter((e) => e.userId === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
