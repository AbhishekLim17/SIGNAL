# Email Outreach Tool

A self-hosted, multi-user web app to scrape contact info from public webpages
(or import your own lists), draft personalized outreach emails with a free LLM,
review/edit/approve each draft, and send them from your own email accounts.

Each user signs in, connects their own sending email(s) through the app, and
only ever sees their own contacts, campaigns, and sends.

## How it works

1. **Sign in** — users create an account (email + password). The first user to
   sign up (or a configured `ADMIN_EMAIL`) becomes an **admin** who can manage
   users. Password reset is self-service via an emailed link.
2. **Connect a sending email** — on the **Accounts** tab, a user adds the email
   address they want to send from (Gmail with an app password, or any custom
   SMTP server). A "Test connection" check runs before it's saved, and passwords
   are **encrypted at rest**.
3. **Get contacts** — **scrape** public URLs, or **import** a CSV/Excel file with
   column mapping (extra columns are carried along as AI context).
4. **Campaign** — fill in a brief (who you are, purpose, tone, key points, CTA).
5. **Drafts** — generate one personalized email per contact via Google Gemini
   (throttled for the free-tier rate limit), then review/edit/approve/reject.
6. **Send** — send approved emails over SMTP from a chosen account, or rotate
   randomly across your accounts, with a delay between sends and a daily cap.

## Setup (for the host / developer)

### 1. Install Node.js 18+ (20 LTS recommended).

### 2. Configure `.env`

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- **`GEMINI_API_KEY`** — free key from https://aistudio.google.com/apikey (shared
  by all users for AI drafting).
- **`SESSION_SECRET`** — random string for signing login cookies. Generate:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **`APP_ENCRYPTION_KEY`** — 64 hex chars (32 bytes) used to encrypt users'
  stored email passwords. Generate the same way. **Back this up** — losing it
  means saved email accounts can't be decrypted.
- **`ADMIN_EMAIL`** *(optional)* — this email becomes admin on signup.
- **System email** *(recommended)* — `GMAIL_USER` + `GMAIL_APP_PASSWORD` (or the
  `SYSTEM_SMTP_*` vars) for a server account that sends **password-reset links**.
  If omitted, reset links are written to the server log instead of emailed.

### 3. Run

```bash
npm start
```

Open the app, sign up (you'll be the admin), and go to **Accounts** to connect a
sending email.

### 4. Hosting & security (important)

This app stores **multiple users' email credentials** (encrypted) and handles
logins, so as the host you're responsible for running it safely:

- **Serve it over HTTPS.** Logins and credentials travel over the network; put it
  behind a TLS-terminating proxy (Caddy, nginx, a platform that provides HTTPS).
  Set `NODE_ENV=production` so session cookies are marked `Secure`.
- **Set `APP_URL`** to your public URL (used in password-reset links).
- **Keep the server and `.env` secure**, and back up `data/db.json` and your
  `APP_ENCRYPTION_KEY`.

### Users connecting Gmail

For a Gmail sending account, users need a one-time **App Password** (Google →
Security → 2-Step Verification → App Passwords) — Google blocks normal passwords
for SMTP. The in-app form makes entering it painless (test + save, no config
files). For other providers, users enter their SMTP host/port/credentials.

## Data & limits

- All data lives in `data/db.json` (gitignored) — scraped PII and encrypted
  email passwords. The write path is serialized so concurrent users don't corrupt
  it. For larger deployments you can move to a real database later.
- **Gemini free tier** limits requests per minute and per day; draft generation is
  paced automatically (`DRAFT_DELAY_MS`).
- **Gmail** sending is ~500/day per account; `MAX_EMAILS_PER_DAY` (default 300)
  keeps each user under that.
- **Responsible use:** only scrape and email addresses you're authorized to
  contact, and comply with applicable anti-spam law (CAN-SPAM, GDPR, etc.). This
  tool doesn't do that compliance for you.

- Reset all data: `npm run reset-db`.
