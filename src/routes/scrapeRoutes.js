import { Router } from 'express';
import { scrapeUrls } from '../scraper/index.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const scrapeRoutes = Router();

scrapeRoutes.post('/scrape', requireAuth, asyncHandler(async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls must be a non-empty array' });
  }
  const results = await scrapeUrls(req.user.id, urls);
  res.json(results);
}));
