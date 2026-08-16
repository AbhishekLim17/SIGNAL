import { Router } from 'express';
import { startDraftJob, getDraftJobStatus } from '../llm/draftService.js';
import { getCampaign } from '../db/campaignsRepo.js';
import { listContacts, getContact, updateContact } from '../db/contactsRepo.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const draftRoutes = Router();

draftRoutes.use(requireAuth);

draftRoutes.post('/drafts/generate', asyncHandler(async (req, res) => {
  const { campaignId, contactIds } = req.body;
  const campaign = await getCampaign(req.user.id, campaignId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  let targets;
  if (Array.isArray(contactIds) && contactIds.length > 0) {
    targets = (await Promise.all(contactIds.map((id) => getContact(req.user.id, id)))).filter(Boolean);
  } else {
    targets = await listContacts(req.user.id, { status: 'scraped' });
  }

  for (const contact of targets) {
    if (contact.campaignId !== campaignId) {
      await updateContact(req.user.id, contact.id, { campaignId });
    }
  }

  const result = await startDraftJob(req.user.id, targets, campaign);
  res.json(result);
}));

draftRoutes.get('/drafts/status', asyncHandler(async (req, res) => {
  res.json(getDraftJobStatus(req.user.id));
}));
