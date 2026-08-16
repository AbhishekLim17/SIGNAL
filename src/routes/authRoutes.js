import { Router } from 'express';
import { env } from '../config/env.js';
import { signup, login, makeSessionToken } from '../auth/authService.js';
import { requestReset, performReset } from '../auth/resetService.js';
import { systemMailConfigured } from '../mailer/systemMailer.js';
import { setSessionCookie, clearSessionCookie, requireAuth } from '../auth/middleware.js';
import { publicUser } from '../db/usersRepo.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const authRoutes = Router();

authRoutes.post('/auth/signup', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await signup(email, password);
  setSessionCookie(res, makeSessionToken(user), env.sessionTtlMs);
  res.status(201).json(publicUser(user));
}));

authRoutes.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await login(email, password);
  setSessionCookie(res, makeSessionToken(user), env.sessionTtlMs);
  res.json(publicUser(user));
}));

authRoutes.post('/auth/logout', asyncHandler(async (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
}));

authRoutes.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  res.json(publicUser(req.user));
}));

authRoutes.post('/auth/forgot', asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  await requestReset(email);
  res.json({ ok: true, emailConfigured: systemMailConfigured() });
}));

authRoutes.post('/auth/reset', asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};
  await performReset(token, password);
  res.json({ ok: true });
}));
