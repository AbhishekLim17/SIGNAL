import nodemailer from 'nodemailer';

// Cache transporters by account id so we don't rebuild them per email.
const transporters = new Map();

function buildTransport(cfg) {
  if (cfg.provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port || 587,
    secure: cfg.secure ?? cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

function getTransport(cfg) {
  if (!transporters.has(cfg.id)) {
    transporters.set(cfg.id, buildTransport(cfg));
  }
  return transporters.get(cfg.id);
}

export function invalidateTransport(id) {
  transporters.delete(id);
}

/** cfg is a decrypted transport config (see emailAccountsRepo.toTransportConfig). */
export async function sendMail(cfg, { to, subject, text }) {
  const transport = getTransport(cfg);
  await transport.sendMail({ from: cfg.user, to, subject, text });
}

/** Verifies SMTP credentials without persisting anything. */
export async function testTransport(cfg) {
  const transport = buildTransport({ ...cfg, id: `test-${Date.now()}` });
  await transport.verify();
}
