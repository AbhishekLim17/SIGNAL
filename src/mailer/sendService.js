import { sendMail } from './mailer.js';
import { randomDelay } from './throttle.js';
import { env } from '../config/env.js';
import { listContacts, setSendResult } from '../db/contactsRepo.js';
import { listAccounts, toTransportConfig } from '../db/emailAccountsRepo.js';
import { appendLog, countToday, getLog } from '../db/sendLogRepo.js';
import { httpError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// Per-user job state, keyed by userId.
const jobs = new Map();

function stateFor(userId) {
  if (!jobs.has(userId)) {
    jobs.set(userId, { running: false, sentCount: 0, failedCount: 0, remaining: 0, cappedForToday: false });
  }
  return jobs.get(userId);
}

export function getJobStatus(userId) {
  return { ...stateFor(userId) };
}

export async function getSendLog(userId) {
  return getLog(userId);
}

async function sendToContact(userId, contact, cfg) {
  const state = stateFor(userId);
  try {
    await sendMail(cfg, { to: contact.email, subject: contact.draft.subject, text: contact.draft.body });
    await setSendResult(userId, contact.id, { success: true });
    await appendLog(userId, { contactId: contact.id, email: contact.email, status: 'sent', sender: cfg.user });
    state.sentCount += 1;
  } catch (err) {
    logger.error(`Send failed for ${contact.email}:`, err.message);
    await setSendResult(userId, contact.id, { success: false, error: err.message });
    await appendLog(userId, { contactId: contact.id, email: contact.email, status: 'failed', error: err.message, sender: cfg.user });
    state.failedCount += 1;
  }
}

/**
 * @param userId the owner
 * @param contactIds optional subset of approved contacts
 * @param senderId a specific account id, or 'random' to rotate across accounts
 */
export async function startSendJob(userId, contactIds, senderId) {
  const state = stateFor(userId);
  if (state.running) throw httpError(409, 'A send job is already running.');

  const accounts = (await listAccounts(userId)).map(toTransportConfig);
  if (accounts.length === 0) {
    throw httpError(400, 'Add and connect at least one email account before sending.');
  }

  const all = contactIds && contactIds.length > 0
    ? (await listContacts(userId, { status: 'approved' })).filter((c) => contactIds.includes(c.id))
    : await listContacts(userId, { status: 'approved' });

  const rotate = !senderId || senderId === 'random';
  const fixed = rotate ? null : accounts.find((a) => a.id === senderId);
  if (!rotate && !fixed) throw httpError(400, 'The selected sending account no longer exists.');

  state.running = true;
  state.sentCount = 0;
  state.failedCount = 0;
  state.remaining = all.length;
  state.cappedForToday = false;

  (async () => {
    for (let i = 0; i < all.length; i++) {
      const sentToday = await countToday(userId);
      if (sentToday >= env.maxEmailsPerDay) {
        state.cappedForToday = true;
        break;
      }
      const cfg = rotate ? accounts[Math.floor(Math.random() * accounts.length)] : fixed;
      await sendToContact(userId, all[i], cfg);
      state.remaining = all.length - (i + 1);
      if (i < all.length - 1) {
        await randomDelay(env.sendDelayMinMs, env.sendDelayMaxMs);
      }
    }
    state.running = false;
  })().catch((err) => {
    logger.error('Send job crashed:', err.message);
    state.running = false;
  });

  return { started: true, targetCount: all.length };
}
