import { Router } from 'express';
import {
  listAccounts,
  getAccount,
  createAccount,
  deleteAccount,
  publicAccount,
  toTransportConfig,
} from '../db/emailAccountsRepo.js';
import { testTransport, invalidateTransport } from '../mailer/mailer.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler, httpError } from '../middleware/errorHandler.js';

export const accountRoutes = Router();

accountRoutes.use(requireAuth);

accountRoutes.get('/', asyncHandler(async (req, res) => {
  const accounts = await listAccounts(req.user.id);
  res.json(accounts.map(publicAccount));
}));

function normalizeFields(body) {
  const provider = (body.provider || 'gmail').toLowerCase();
  const fields = {
    label: (body.label || '').trim() || (body.user || '').trim(),
    provider,
    user: (body.user || body.email || '').trim(),
    pass: body.pass || body.password || '',
    host: provider === 'custom' ? (body.host || '').trim() : null,
    port: provider === 'custom' && body.port ? Number(body.port) : null,
    secure: provider === 'custom' ? body.secure === true || body.secure === 'true' : undefined,
  };
  if (!fields.user) throw httpError(400, 'Email address is required.');
  if (!fields.pass) throw httpError(400, 'Password / app password is required.');
  if (provider === 'custom' && !fields.host) throw httpError(400, 'SMTP host is required for a custom account.');
  return fields;
}

// Test SMTP credentials without saving.
accountRoutes.post('/test', asyncHandler(async (req, res) => {
  const fields = normalizeFields(req.body || {});
  try {
    await testTransport(fields);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}));

// Test then save.
accountRoutes.post('/', asyncHandler(async (req, res) => {
  const fields = normalizeFields(req.body || {});
  try {
    await testTransport(fields);
  } catch (err) {
    throw httpError(400, `Could not connect with those details: ${err.message}`);
  }
  const account = await createAccount(req.user.id, fields);
  res.status(201).json(publicAccount(account));
}));

accountRoutes.delete('/:id', asyncHandler(async (req, res) => {
  const account = await getAccount(req.user.id, req.params.id);
  if (!account) return res.status(404).json({ error: 'Not found' });
  invalidateTransport(account.id);
  await deleteAccount(req.user.id, req.params.id);
  res.json({ deleted: true });
}));

// Used internally by the send service; not a route export helper.
export { toTransportConfig };
