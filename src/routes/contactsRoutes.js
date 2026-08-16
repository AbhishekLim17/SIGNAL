import { Router } from 'express';
import {
  listContacts,
  getContact,
  updateContact,
  deleteContact,
  editDraft,
  setStatus,
} from '../db/contactsRepo.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const contactsRoutes = Router();

contactsRoutes.use(requireAuth);

contactsRoutes.get('/contacts', asyncHandler(async (req, res) => {
  const { status, campaignId } = req.query;
  const contacts = await listContacts(req.user.id, { status, campaignId });
  res.json(contacts);
}));

contactsRoutes.get('/contacts/:id', asyncHandler(async (req, res) => {
  const contact = await getContact(req.user.id, req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
}));

contactsRoutes.patch('/contacts/:id', asyncHandler(async (req, res) => {
  const contact = await updateContact(req.user.id, req.params.id, req.body);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
}));

contactsRoutes.delete('/contacts/:id', asyncHandler(async (req, res) => {
  const ok = await deleteContact(req.user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
}));

contactsRoutes.patch('/drafts/:contactId', asyncHandler(async (req, res) => {
  const { subject, body } = req.body;
  const contact = await editDraft(req.user.id, req.params.contactId, { subject, body });
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
}));

contactsRoutes.post('/contacts/:id/approve', asyncHandler(async (req, res) => {
  const contact = await setStatus(req.user.id, req.params.id, 'approved');
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
}));

contactsRoutes.post('/contacts/:id/reject', asyncHandler(async (req, res) => {
  const contact = await setStatus(req.user.id, req.params.id, 'rejected');
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
}));
