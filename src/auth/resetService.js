import { env } from '../config/env.js';
import { randomToken, sha256, hashPassword } from '../utils/crypto.js';
import { findByEmail, updateUser } from '../db/usersRepo.js';
import { getDb } from '../db/db.js';
import { sendSystemMail } from '../mailer/systemMailer.js';
import { httpError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Starts a password reset. Always resolves the same way regardless of whether
 * the email exists, so the endpoint can't be used to probe for accounts.
 */
export async function requestReset(email) {
  const user = await findByEmail(email);
  if (!user) return;

  const token = randomToken();
  await updateUser(user.id, {
    resetTokenHash: sha256(token),
    resetTokenExpiry: Date.now() + env.resetTtlMs,
  });

  const link = `${env.appUrl}/reset.html?token=${token}`;
  let sent = false;
  try {
    sent = await sendSystemMail({
      to: user.email,
      subject: 'Reset your Outreach password',
      text: `Someone requested a password reset for your Outreach account.\n\nReset it here (link valid for 1 hour):\n${link}\n\nIf this wasn't you, you can ignore this email.`,
    });
  } catch (err) {
    // A misconfigured/unreachable system mailer must never break the flow.
    logger.warn(`System email send failed during password reset: ${err.message}`);
  }
  if (!sent) {
    // Surface the link server-side so an admin can relay it manually.
    logger.warn(`Password reset link for ${user.email}: ${link}`);
  }
}

export async function performReset(token, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters.');
  }
  const tokenHash = sha256(String(token || ''));
  const db = await getDb();
  const user = db.data.users.find(
    (u) => u.resetTokenHash && u.resetTokenHash === tokenHash && u.resetTokenExpiry > Date.now()
  );
  if (!user) throw httpError(400, 'This reset link is invalid or has expired.');

  await updateUser(user.id, {
    passwordHash: hashPassword(newPassword),
    resetTokenHash: null,
    resetTokenExpiry: null,
  });
}
