import dotenv from 'dotenv';

dotenv.config();

/**
 * The system transactional sender is used for app emails like password resets.
 * It reuses the GMAIL_* vars (in the hosted model, end users add their own
 * sending accounts in-app; GMAIL_* becomes the server's system account).
 */
function parseSystemSender() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return { provider: 'gmail', user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD };
  }
  if (process.env.SYSTEM_SMTP_USER && process.env.SYSTEM_SMTP_PASS) {
    return {
      provider: 'custom',
      host: process.env.SYSTEM_SMTP_HOST,
      port: process.env.SYSTEM_SMTP_PORT ? Number(process.env.SYSTEM_SMTP_PORT) : 587,
      secure: process.env.SYSTEM_SMTP_SECURE === 'true',
      user: process.env.SYSTEM_SMTP_USER,
      pass: process.env.SYSTEM_SMTP_PASS,
    };
  }
  return null;
}

export function validateEnv() {
  const missing = [];
  if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!process.env.APP_ENCRYPTION_KEY) missing.push('APP_ENCRYPTION_KEY (64 hex chars)');
  if (missing.length > 0) {
    throw new Error(
      `Missing required configuration: ${missing.join(', ')}. Copy .env.example to .env and fill it in.`
    );
  }
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  appUrl: process.env.APP_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
  sessionSecret: process.env.SESSION_SECRET,
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY,
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase().trim() || null,
  systemSender: parseSystemSender(),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  sendDelayMinMs: Number(process.env.SEND_DELAY_MIN_MS) || 20000,
  sendDelayMaxMs: Number(process.env.SEND_DELAY_MAX_MS) || 60000,
  maxEmailsPerDay: Number(process.env.MAX_EMAILS_PER_DAY) || 300,
  draftDelayMs: Number(process.env.DRAFT_DELAY_MS) || 4500,
  sessionTtlMs: 1000 * 60 * 60 * 24 * 7, // 7 days
  resetTtlMs: 1000 * 60 * 60, // 1 hour
};
