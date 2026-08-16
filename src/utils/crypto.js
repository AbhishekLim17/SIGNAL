import crypto from 'node:crypto';
import { env } from '../config/env.js';

let cachedKey;
function key() {
  if (!cachedKey) {
    const raw = Buffer.from(env.appEncryptionKey, 'hex');
    if (raw.length !== 32) {
      throw new Error('APP_ENCRYPTION_KEY must be 32 bytes as 64 hex characters.');
    }
    cachedKey = raw;
  }
  return cachedKey;
}

// ── Password hashing (scrypt) ────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Secret encryption at rest (AES-256-GCM) ──────────────────────
export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(blob) {
  const [ivh, tagh, ench] = blob.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivh, 'hex'));
  decipher.setAuthTag(Buffer.from(tagh, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ench, 'hex')), decipher.final()]).toString('utf8');
}

// ── Tokens ───────────────────────────────────────────────────────
export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ── Stateless signed session token (HMAC-SHA256) ─────────────────
export function signSession(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (obj.exp && obj.exp < Date.now()) return null;
    return obj;
  } catch {
    return null;
  }
}
