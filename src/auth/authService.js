import { env } from '../config/env.js';
import { hashPassword, verifyPassword, signSession } from '../utils/crypto.js';
import { countUsers, findByEmail, createUser, findById } from '../db/usersRepo.js';
import { httpError } from '../middleware/errorHandler.js';

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/;

export function makeSessionToken(user) {
  return signSession({ uid: user.id, exp: Date.now() + env.sessionTtlMs });
}

export async function signup(email, password) {
  const norm = String(email || '').toLowerCase().trim();
  if (!EMAIL_RE.test(norm)) throw httpError(400, 'Enter a valid email address.');
  if (!password || password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');
  if (await findByEmail(norm)) throw httpError(409, 'An account with that email already exists.');

  // The first registered user (or a matching ADMIN_EMAIL) becomes an admin.
  const isFirst = (await countUsers()) === 0;
  const role = isFirst || (env.adminEmail && norm === env.adminEmail) ? 'admin' : 'user';

  const user = await createUser({ email: norm, passwordHash: hashPassword(password), role });
  return user;
}

export async function login(email, password) {
  const user = await findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw httpError(401, 'Incorrect email or password.');
  }
  if (!user.active) throw httpError(403, 'This account has been deactivated.');
  return user;
}

export async function getUserById(id) {
  return findById(id);
}
