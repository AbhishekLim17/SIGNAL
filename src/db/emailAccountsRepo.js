import { randomUUID } from 'node:crypto';
import { getDb, persist } from './db.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';

/** Safe view for the UI — never exposes the encrypted password. */
export function publicAccount(a) {
  return {
    id: a.id,
    label: a.label,
    provider: a.provider,
    host: a.host,
    port: a.port,
    secure: a.secure,
    email: a.user,
  };
}

export async function listAccounts(userId) {
  const db = await getDb();
  return db.data.emailAccounts.filter((a) => a.userId === userId);
}

export async function getAccount(userId, id) {
  const db = await getDb();
  return db.data.emailAccounts.find((a) => a.id === id && a.userId === userId) || null;
}

export async function createAccount(userId, fields) {
  const db = await getDb();
  const account = {
    id: randomUUID(),
    userId,
    label: fields.label || fields.user,
    provider: (fields.provider || 'gmail').toLowerCase(),
    host: fields.host || null,
    port: fields.port ? Number(fields.port) : null,
    secure: fields.secure ?? undefined,
    user: fields.user,
    passEncrypted: encryptSecret(fields.pass),
    createdAt: new Date().toISOString(),
  };
  db.data.emailAccounts.push(account);
  await persist(db);
  return account;
}

export async function deleteAccount(userId, id) {
  const db = await getDb();
  const before = db.data.emailAccounts.length;
  db.data.emailAccounts = db.data.emailAccounts.filter((a) => !(a.id === id && a.userId === userId));
  await persist(db);
  return db.data.emailAccounts.length < before;
}

/** Returns an account with the password decrypted, ready for nodemailer. */
export function toTransportConfig(account) {
  return {
    id: account.id,
    provider: account.provider,
    host: account.host,
    port: account.port,
    secure: account.secure,
    user: account.user,
    pass: decryptSecret(account.passEncrypted),
  };
}
