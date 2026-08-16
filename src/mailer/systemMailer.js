import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter;

function getTransporter() {
  if (!env.systemSender) return null;
  if (!transporter) {
    const s = env.systemSender;
    transporter = s.provider === 'gmail'
      ? nodemailer.createTransport({ service: 'gmail', auth: { user: s.user, pass: s.pass } })
      : nodemailer.createTransport({
          host: s.host,
          port: s.port || 587,
          secure: s.secure ?? s.port === 465,
          auth: { user: s.user, pass: s.pass },
        });
  }
  return transporter;
}

/**
 * Sends a transactional email (e.g. password reset) from the server's system
 * account. Returns true if sent; false (with a server-side log) if no system
 * account is configured.
 */
export async function sendSystemMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    logger.warn(`No system email configured; cannot send "${subject}" to ${to}.`);
    return false;
  }
  await t.sendMail({ from: env.systemSender.user, to, subject, text });
  return true;
}

export function systemMailConfigured() {
  return Boolean(env.systemSender);
}
