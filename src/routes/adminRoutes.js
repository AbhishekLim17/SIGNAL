import { Router } from 'express';
import { listUsers, findById, updateUser, publicUser } from '../db/usersRepo.js';
import { requireAdmin } from '../auth/middleware.js';
import { asyncHandler, httpError } from '../middleware/errorHandler.js';

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);

adminRoutes.get('/users', asyncHandler(async (req, res) => {
  res.json(await listUsers());
}));

adminRoutes.patch('/users/:id', asyncHandler(async (req, res) => {
  const target = await findById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });

  const patch = {};
  if (typeof req.body.active === 'boolean') {
    if (target.id === req.user.id && req.body.active === false) {
      throw httpError(400, 'You cannot deactivate your own account.');
    }
    patch.active = req.body.active;
  }
  if (req.body.role === 'admin' || req.body.role === 'user') {
    if (target.id === req.user.id && req.body.role !== 'admin') {
      throw httpError(400, 'You cannot remove your own admin role.');
    }
    patch.role = req.body.role;
  }

  const updated = await updateUser(target.id, patch);
  res.json(publicUser(updated));
}));
