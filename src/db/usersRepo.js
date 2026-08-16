import { randomUUID } from 'node:crypto';
import { getDb, persist } from './db.js';

function now() {
  return new Date().toISOString();
}

/** Safe view of a user (no password hash / reset token). */
export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, role: u.role, active: u.active, createdAt: u.createdAt };
}

export async function countUsers() {
  const db = await getDb();
  return db.data.users.length;
}

export async function findByEmail(email) {
  const db = await getDb();
  const norm = String(email || '').toLowerCase().trim();
  return db.data.users.find((u) => u.email === norm) || null;
}

export async function findById(id) {
  const db = await getDb();
  return db.data.users.find((u) => u.id === id) || null;
}

export async function createUser({ email, passwordHash, role }) {
  const db = await getDb();
  const user = {
    id: randomUUID(),
    email: String(email).toLowerCase().trim(),
    passwordHash,
    role: role || 'user',
    active: true,
    resetTokenHash: null,
    resetTokenExpiry: null,
    createdAt: now(),
  };
  db.data.users.push(user);
  await persist(db);
  return user;
}

export async function updateUser(id, patch) {
  const db = await getDb();
  const user = db.data.users.find((u) => u.id === id);
  if (!user) return null;
  Object.assign(user, patch);
  await persist(db);
  return user;
}

export async function listUsers() {
  const db = await getDb();
  return db.data.users.map(publicUser);
}
