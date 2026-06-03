# Smart Finance Buddy

Personal finance tracker. Connect your bank via Plaid, auto-sync transactions, categorize spend.

**Stack:** Next.js (App Router) · Postgres (Neon) · Prisma · Clerk · Plaid

## Setup

### 1. Install

```bash
npm install
```

### 2. External accounts

- [Neon](https://neon.tech) — create a Postgres project, copy the connection string.
- [Clerk](https://clerk.com) — create an app, grab publishable + secret keys.
- [Plaid](https://dashboard.plaid.com) — create a sandbox app, grab `client_id` + `secret`.

### 3. Env vars

```bash
cp .env.example .env.local
```

Fill in `.env.local`. Generate `TOKEN_ENCRYPTION_KEY` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Database

```bash
npm run db:push       # apply Prisma schema
npm run db:seed       # seed system categories
```

### 5. Run

```bash
npm run dev
```

Visit http://localhost:3000.

### 6. Plaid webhook (for incremental sync)

Plaid needs to call your `/api/plaid/webhook` endpoint. Two options:

- **Local dev:** expose with `ngrok http 3000`, set `PLAID_WEBHOOK_URL` to the ngrok URL + `/api/plaid/webhook`.
- **Deployed:** Vercel URL works directly.

In Plaid sandbox you can also trigger a fake webhook from the dashboard or via the API.

## Architecture notes

- **Token storage:** Plaid `access_token` is encrypted with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`) before insertion. Decrypt happens only inside `lib/sync.ts`. Upgrade path: move to AWS KMS envelope encryption before going to Plaid Production.
- **Sync:** Uses Plaid `/transactions/sync` (cursor-based). Cursor lives on `PlaidItem.cursor`.
- **Webhook verification:** ES256 JWT verification per [Plaid docs](https://plaid.com/docs/api/webhooks/webhook-verification/). Verification keys cached for 24h.
- **Logging:** `lib/logger.ts` auto-redacts anything matching `access-*-...` to avoid leaking tokens in logs.
- **Initial sync is inline** in the exchange route. For accounts with thousands of transactions this will hit Vercel's function timeout — move to a queue (e.g. Inngest, QStash) when this becomes a problem.

## Next up

- [ ] Transactions list page
- [ ] Category management UI
- [ ] User-editable rules
- [ ] Monthly / category reports
- [ ] LLM categorization fallback (Claude Haiku)
- [ ] Recurring transaction detection
