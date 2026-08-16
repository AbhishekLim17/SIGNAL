import { Router } from 'express';
import { listCampaigns, getCampaign, createCampaign } from '../db/campaignsRepo.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const campaignRoutes = Router();

campaignRoutes.use(requireAuth);

campaignRoutes.get('/campaigns', asyncHandler(async (req, res) => {
  res.json(await listCampaigns(req.user.id));
}));

campaignRoutes.get('/campaigns/:id', asyncHandler(async (req, res) => {
  const campaign = await getCampaign(req.user.id, req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  res.json(campaign);
}));

campaignRoutes.post('/campaigns', asyncHandler(async (req, res) => {
  const campaign = await createCampaign(req.user.id, req.body);
  res.status(201).json(campaign);
}));
