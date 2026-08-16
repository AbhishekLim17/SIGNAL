import { buildPrompt } from './promptTemplate.js';
import { generateText } from './geminiClient.js';
import { setDraft } from '../db/contactsRepo.js';
import { env } from '../config/env.js';
import { httpError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripCodeFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

function fallbackDraft(contact, campaign) {
  const name = contact.name || 'there';
  return {
    subject: campaign.purpose || 'Quick note',
    body: `Hi ${name},\n\n${campaign.purpose}\n\n${campaign.callToAction}\n\nBest,\n${campaign.senderName}`,
  };
}

async function generateOne(contact, campaign) {
  const prompt = buildPrompt(contact, campaign);
  try {
    const raw = await generateText(prompt);
    const cleaned = stripCodeFences(raw);
    const parsed = JSON.parse(cleaned);
    if (!parsed.subject || !parsed.body) throw new Error('missing subject/body');
    return { subject: parsed.subject, body: parsed.body, generatedAt: new Date().toISOString(), model: env.geminiModel };
  } catch (err) {
    logger.warn(`Draft parse/generation failed for ${contact.email}, retrying once:`, err.message);
    try {
      const raw = await generateText(prompt);
      const cleaned = stripCodeFences(raw);
      const parsed = JSON.parse(cleaned);
      if (!parsed.subject || !parsed.body) throw new Error('missing subject/body');
      return { subject: parsed.subject, body: parsed.body, generatedAt: new Date().toISOString(), model: env.geminiModel };
    } catch (err2) {
      logger.error(`Draft generation failed twice for ${contact.email}, using fallback template:`, err2.message);
      return { ...fallbackDraft(contact, campaign), generatedAt: new Date().toISOString(), model: 'fallback-template' };
    }
  }
}

// Per-user draft job state, keyed by userId.
const jobs = new Map();

function stateFor(userId) {
  if (!jobs.has(userId)) jobs.set(userId, { running: false, done: 0, total: 0, failed: 0 });
  return jobs.get(userId);
}

export function getDraftJobStatus(userId) {
  return { ...stateFor(userId) };
}

/**
 * Generates drafts sequentially with a delay between requests to stay
 * under Gemini free-tier's per-minute rate limit. Runs as a background
 * job (polled via getDraftJobStatus) since a full batch can take minutes.
 */
export async function startDraftJob(userId, contacts, campaign) {
  const state = stateFor(userId);
  if (state.running) throw httpError(409, 'A draft generation job is already running.');
  state.running = true;
  state.done = 0;
  state.total = contacts.length;
  state.failed = 0;

  (async () => {
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      try {
        const draft = await generateOne(contact, campaign);
        await setDraft(userId, contact.id, draft);
        if (draft.model === 'fallback-template') state.failed += 1;
      } catch (err) {
        logger.error(`Unexpected draft failure for ${contact.email}:`, err.message);
        state.failed += 1;
      }
      state.done = i + 1;
      if (i < contacts.length - 1) {
        await sleep(env.draftDelayMs);
      }
    }
    state.running = false;
  })().catch((err) => {
    logger.error('Draft job crashed:', err.message);
    state.running = false;
  });

  return { started: true, total: contacts.length };
}
