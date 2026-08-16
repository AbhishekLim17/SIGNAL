import { randomUUID } from 'node:crypto';
import { getDb, persist } from './db.js';

export async function listCampaigns(userId) {
  const db = await getDb();
  return db.data.campaigns.filter((c) => c.userId === userId);
}

export async function getCampaign(userId, id) {
  const db = await getDb();
  return db.data.campaigns.find((c) => c.id === id && c.userId === userId) || null;
}

export async function createCampaign(userId, fields) {
  const db = await getDb();
  const campaign = {
    id: randomUUID(),
    userId,
    senderName: fields.senderName || '',
    senderTitle: fields.senderTitle || '',
    senderCompany: fields.senderCompany || '',
    senderReplyEmail: fields.senderReplyEmail || '',
    purpose: fields.purpose || '',
    tone: fields.tone || 'Friendly',
    keyPoints: Array.isArray(fields.keyPoints) ? fields.keyPoints : [],
    callToAction: fields.callToAction || '',
    createdAt: new Date().toISOString(),
  };
  db.data.campaigns.push(campaign);
  await persist(db);
  return campaign;
}
