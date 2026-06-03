# Smart Finance Buddy

A modern personal finance tracker. Connect your bank accounts via Plaid, auto-sync transactions, categorize spend, detect recurring subscriptions, and analyze monthly cash flow — all in a clean dark-mode dashboard.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Postgres](https://img.shields.io/badge/Postgres-Neon-336791?logo=postgresql)
![Plaid](https://img.shields.io/badge/Plaid-Transactions-000000?logo=plaid)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF)

---

## Features

- **Bank linking** — Connect US and Canadian banks through Plaid Link. Encrypted access tokens at rest, cleanly revoke on disconnect.
- **Automatic transaction sync** — Uses Plaid's `/transactions/sync` cursor-based endpoint. Manual sync button on the dashboard; webhook handler ready for incremental updates.
- **Smart categorization** — Three-stage pipeline: Plaid's PFC taxonomy → user-editable rules (planned) → LLM fallback for the long tail (planned). User overrides are preserved on re-sync.
- **Spend reports** — Monthly view with stat cards (spend / income / net), bar chart of spend by category, prev/next month navigation, custom date range up to 90 days.
- **Subscriptions** — Recurring outflows auto-detected via Plaid's recurring endpoint. Estimated monthly + annualized totals.
- **Transaction explorer** — Searchable list with date-range and per-account filters, pending badges, colored category dots.
- **Dark mode by default** — Geist font, tabular numerals for amounts, subtle animations.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS, shadcn primitives, Lucide icons, Geist font |
| Auth | Clerk |
| Database | Postgres (Neon) via Prisma |
| Bank integration | Plaid (US + Canada) |
| Encryption | AES-256-GCM envelope encryption for access tokens |
| Hosting target | Vercel + Neon |

## Screenshots

*(Add screenshots of the dashboard, transactions, reports, and subscriptions pages here.)*

## Getting started

### 1. Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- A [Clerk](https://clerk.com) application
- A [Plaid](https://dashboard.plaid.com/signup) account (sandbox is free)

### 2. Install

```bash
git clone https://github.com/Kabilesh-T/smart-finance-buddy.git
cd smart-finance-buddy
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Neon dashboard → connection string (pooled) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `PLAID_CLIENT_ID` | Plaid dashboard → Team Settings → Keys |
| `PLAID_SECRET` | Plaid dashboard → Team Settings → Keys (Sandbox) |
| `PLAID_ENV` | `sandbox` to start |
| `PLAID_WEBHOOK_URL` | Your deployed URL + `/api/plaid/webhook` (optional in dev) |
| `TOKEN_ENCRYPTION_KEY` | Generate with the command below |

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Initialize the database

```bash
npm run db:push      # creates tables in Neon
npm run db:seed      # inserts default categories
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up via Clerk, and click **Connect a bank**. In Plaid sandbox, use credentials `user_good` / `pass_good` to simulate a real bank login.

### 6. Webhooks (optional in dev)

For automatic incremental sync without clicking the Sync button:

```bash
ngrok http 3000
```

Set `PLAID_WEBHOOK_URL=https://<your-ngrok-url>/api/plaid/webhook` in `.env.local` and restart the dev server. New transactions will arrive automatically.

## Architecture

### Sync flow

```
Browser ──▶ /api/plaid/link-token ──▶ Plaid /link/token/create
   │
   ▼
Plaid Link (user authenticates)
   │
   ▼
Browser ──▶ /api/plaid/exchange ──▶ Plaid /item/public_token/exchange
                                          │
                                          ▼
                                    Encrypt access_token (AES-256-GCM)
                                          │
                                          ▼
                                    INSERT plaid_items
                                          │
                                          ▼
                                    syncItem(itemId)
                                          │
                                          ▼
                              Plaid /transactions/sync (cursor-based)
                                          │
                                          ▼
                              Upsert accounts + transactions
                                          │
                                          ▼
                              Plaid /transactions/recurring/get
                                          │
                                          ▼
                              Upsert recurring streams
```

### Categorization pipeline

Applied per transaction at write time:

1. Look up user/rule overrides (planned).
2. Fall back to mapped Plaid PFC category (detailed → primary).
3. Default to **Other** if nothing matches.
4. User overrides are preserved across re-syncs.

### Data model

Core tables:

- `User` — Clerk-synced user records
- `PlaidItem` — one row per bank connection (encrypted access token, cursor)
- `Account` — checking / savings / credit accounts under an Item
- `Transaction` — individual transactions with Plaid PFC + mapped category
- `Category` — system defaults + per-user categories
- `Rule` — auto-categorization rules (matched by merchant)
- `RecurringStream` — Plaid-detected recurring inflows/outflows
- `WebhookEvent` — audit + idempotency log for Plaid webhooks
- `AuditLog` — sensitive-action audit trail

See [`prisma/schema.prisma`](prisma/schema.prisma) for the full schema.

## Project structure

```
src/
├── app/
│   ├── (app)/                  # Authed layout (sidebar + main)
│   │   ├── page.tsx            # Dashboard
│   │   ├── transactions/
│   │   ├── subscriptions/
│   │   └── reports/
│   ├── api/
│   │   ├── plaid/
│   │   │   ├── link-token/     # POST: create Plaid Link token
│   │   │   ├── exchange/       # POST: exchange public_token, start sync
│   │   │   └── webhook/        # POST: handle Plaid webhooks
│   │   └── items/[id]/
│   │       ├── route.ts        # DELETE: disconnect bank
│   │       └── sync/route.ts   # POST: manual sync
│   ├── sign-in/
│   ├── sign-up/
│   ├── layout.tsx              # Root: ClerkProvider + Geist font
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn primitives
│   ├── Sidebar.tsx
│   ├── ConnectBankButton.tsx
│   ├── SyncButton.tsx
│   ├── DisconnectBankButton.tsx
│   ├── DateRangeFilter.tsx
│   └── AccountFilter.tsx
├── lib/
│   ├── db.ts                   # Prisma singleton
│   ├── plaid.ts                # PlaidApi client
│   ├── crypto.ts               # AES-256-GCM helpers
│   ├── sync.ts                 # syncItem + syncRecurring
│   ├── categorize.ts           # PFC → system category mapping
│   ├── webhook-verify.ts       # Plaid JWT signature verification
│   ├── logger.ts               # JSON logger with token redaction
│   ├── user.ts                 # Clerk → DB user upsert
│   └── utils.ts                # cn helper, formatters
└── middleware.ts               # Clerk auth middleware
```

## Roadmap

- [ ] User-editable category overrides + rules (compounds: every override teaches the system)
- [ ] LLM categorization fallback (Claude Haiku) for the long-tail "Other" merchants
- [ ] Per-account drill-in page with balance history
- [ ] CSV / OFX export
- [ ] Mobile app (React Native)
- [ ] Upgrade envelope encryption to AWS KMS before going to Plaid Production
- [ ] Background sync queue (Inngest / QStash) for accounts with deep history

## Security notes

- Plaid access tokens are encrypted at rest using AES-256-GCM. The master key lives in `TOKEN_ENCRYPTION_KEY` and is only used inside `src/lib/crypto.ts`.
- The logger in `src/lib/logger.ts` automatically redacts anything matching the Plaid access-token pattern, to prevent accidental log leakage.
- Plaid webhook signatures are verified using ES256 JWTs with cached verification keys.
- Sensitive operations (token decrypt, item disconnect) write to `audit_log`.
- Disconnecting a bank revokes Plaid's access token via `/item/remove` before deleting local records.

## License

MIT
