import { Router } from 'express';
import { startSendJob, getJobStatus, getSendLog } from '../mailer/sendService.js';
import { listAccounts, publicAccount } from '../db/emailAccountsRepo.js';
import { countToday } from '../db/sendLogRepo.js';
import { env } from '../config/env.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const sendRoutes = Router();

sendRoutes.use(requireAuth);

sendRoutes.get('/senders', asyncHandler(async (req, res) => {
  const accounts = await listAccounts(req.user.id);
  res.json(accounts.map(publicAccount));
}));

sendRoutes.post('/send', asyncHandler(async (req, res) => {
  const { contactIds, senderId } = req.body || {};
  const result = await startSendJob(req.user.id, contactIds, senderId);
  res.json(result);
}));

sendRoutes.get('/send/status', asyncHandler(async (req, res) => {
  const sentToday = await countToday(req.user.id);
  res.json({
    ...getJobStatus(req.user.id),
    dailyCapRemaining: Math.max(0, env.maxEmailsPerDay - sentToday),
  });
}));

sendRoutes.get('/send/log', asyncHandler(async (req, res) => {
  res.json(await getSendLog(req.user.id));
}));
