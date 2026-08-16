import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, validateEnv } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { attachUser } from './auth/middleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { accountRoutes } from './routes/accountRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { scrapeRoutes } from './routes/scrapeRoutes.js';
import { importRoutes } from './routes/importRoutes.js';
import { contactsRoutes } from './routes/contactsRoutes.js';
import { campaignRoutes } from './routes/campaignRoutes.js';
import { draftRoutes } from './routes/draftRoutes.js';
import { sendRoutes } from './routes/sendRoutes.js';
import { logger } from './utils/logger.js';

validateEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
app.set('trust proxy', 1); // correct client IP / Secure cookies behind a proxy
app.use(express.json({ limit: '25mb' }));
app.use(attachUser);

// The main app page requires a session; unauthenticated visitors go to login.
app.get('/', (req, res, next) => {
  if (!req.user) return res.redirect('/login.html');
  next();
});
app.get('/index.html', (req, res, next) => {
  if (!req.user) return res.redirect('/login.html');
  next();
});

app.use(express.static(publicDir));

app.use('/api', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', scrapeRoutes);
app.use('/api', importRoutes);
app.use('/api', contactsRoutes);
app.use('/api', campaignRoutes);
app.use('/api', draftRoutes);
app.use('/api', sendRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  logger.info(`Email Outreach Tool running at ${env.appUrl}`);
});
