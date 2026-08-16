import { Router } from 'express';
import multer from 'multer';
import { parseBuffer, suggestMapping, commitImport } from '../importer/importService.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const importRoutes = Router();

importRoutes.use(requireAuth);

importRoutes.post('/import/preview', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { columns, rows } = await parseBuffer(req.file.buffer, req.file.originalname);
  if (columns.length === 0) {
    return res.status(400).json({ error: 'Could not read any columns from that file.' });
  }
  res.json({
    columns,
    rows,
    rowCount: rows.length,
    suggestedMapping: suggestMapping(columns),
  });
}));

importRoutes.post('/import/commit', asyncHandler(async (req, res) => {
  const { rows, mapping } = req.body;
  if (!mapping || !mapping.email) {
    return res.status(400).json({ error: 'An Email column mapping is required.' });
  }
  const result = await commitImport(req.user.id, rows, mapping);
  res.json(result);
}));
