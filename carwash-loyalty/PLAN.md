# Car Wash Loyalty System — Full Technical Plan (MVP)

> Design target: dark navy & white, mobile-first, premium brand feel.

---

## 1. MVP Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│  Customer (browser)          Staff / Owner (browser)             │
│  ─────────────────           ──────────────────────             │
│  Receives SMS / email link   Mobile-friendly staff web app       │
│  Opens /card/:id             Login → Scan QR → Add stamp         │
│  Adds to Apple / Google      View history, redeem reward         │
│  Wallet via /wallet/apple    Admin: analytics dashboard          │
│  or /wallet/google           Manual stamp adjust                  │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTPS / REST
┌──────────────────────────────────▼──────────────────────────────┐
│                       API LAYER (Node.js + Express)              │
│                                                                  │
│  /api/customers   — register, lookup, QR                        │
│  /api/stamps      — add stamp, history                           │
│  /api/rewards     — redeem free wash                             │
│  /api/admin       — analytics, adjust, list customers            │
│  /api/wallet      — generate Apple .pkpass / Google JWT          │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│                     DATA LAYER (Supabase)                        │
│                                                                  │
│  PostgreSQL DB         Row-Level Security policies               │
│  Supabase Auth         JWT tokens for staff/admin                │
│  Supabase Storage      Pass assets (logo, icon, strip)           │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Decision

| Concern            | Choice                        | Why                                    |
|--------------------|-------------------------------|----------------------------------------|
| Frontend           | Next.js 14 (App Router)       | Mobile-first PWA, SSR for Wallet links |
| Backend            | Node.js + Express             | Lightweight, easy PassKit integration  |
| Database           | Supabase PostgreSQL           | Free tier, Auth + RLS built-in         |
| Auth               | Supabase Auth (email/password)| Staff login, JWT propagated to API     |
| QR generation      | `qrcode` npm package          | Simple, reliable, no external cost     |
| QR scanning        | `html5-qrcode` (browser)      | Works in mobile Safari + Chrome        |
| Apple Wallet       | `passkit-generator` npm pkg   | Needs Apple Developer account          |
| Google Wallet      | Google Wallet API (JWT)       | Needs Google Cloud project             |
| Wallet shortcut    | PassKit.io or Walletpasses.io | Third-party SaaS, no cert needed       |
| Styling            | Tailwind CSS                  | Dark navy (#0A1628) + white theme      |

---

## 2. Database Schema

```sql
-- ─────────────────────────────────────────
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────

-- CUSTOMERS
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT UNIQUE,
  email       TEXT,
  qr_token    TEXT UNIQUE NOT NULL,  -- random token encoded in QR
  stamp_count INTEGER NOT NULL DEFAULT 0,
  total_stamps INTEGER NOT NULL DEFAULT 0,  -- lifetime total
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STAMPS  (one row per stamp event)
CREATE TABLE stamps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stamped_by  UUID NOT NULL REFERENCES auth.users(id),
  stamped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle       INTEGER NOT NULL,   -- wash cycle number (1, 2, 3 …)
  notes       TEXT
);

-- REWARDS  (one row per free wash redeemed)
CREATE TABLE rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  redeemed_by   UUID NOT NULL REFERENCES auth.users(id),
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle         INTEGER NOT NULL
);

-- STAFF  (extends auth.users)
CREATE TABLE staff (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'staff',  -- 'admin' | 'staff'
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SCAN_LOGS  (audit + duplicate prevention)
CREATE TABLE scan_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  staff_id    UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,  -- 'stamp' | 'redeem' | 'view'
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  TEXT
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_stamps_customer   ON stamps(customer_id);
CREATE INDEX idx_stamps_stamped_at ON stamps(stamped_at);
CREATE INDEX idx_rewards_customer  ON rewards(customer_id);
CREATE INDEX idx_scan_logs_time    ON scan_logs(scanned_at);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs  ENABLE ROW LEVEL SECURITY;

-- Staff can read all customers (API uses service-role key for writes)
CREATE POLICY "staff_read_customers" ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff_read_stamps" ON stamps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff_read_rewards" ON rewards
  FOR SELECT TO authenticated USING (true);

-- Staff can only read their own row
CREATE POLICY "staff_read_self" ON staff
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin can read all staff rows
CREATE POLICY "admin_read_staff" ON staff
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 3. Customer User Flow

```
1.  Customer arrives at car wash (first time)
    └─► Staff registers them on the spot (name + phone/email)
        └─► System creates customer record + unique QR token
            └─► Customer receives SMS/email with link:
                https://yourapp.com/card/{qr_token}

2.  Customer opens link on phone
    └─► Sees their digital loyalty card (stamp grid 5 stamps)
        └─► Taps "Add to Apple Wallet" or "Add to Google Wallet"
            └─► Card saved to phone Wallet app

3.  Next visit — customer shows QR code from Wallet or browser
    └─► Staff scans QR → stamp added → card updates
        (After 5 stamps → "FREE WASH" banner appears)

4.  Free wash redemption
    └─► Staff presses "Redeem Free Wash" button
        └─► stamp_count resets to 0, new cycle begins
            └─► Customer gets a new blank card
```

---

## 4. Staff / Admin Flow

```
1.  Staff opens https://yourapp.com/staff on mobile browser
2.  Logs in with email + password (Supabase Auth)
3.  Main screen shows:
    ├─ [Scan QR Code] button  →  camera opens, scans customer QR
    │   └─ Customer found → show name, stamp count (e.g. 3/5)
    │       ├─ [Add Stamp]  → POST /api/stamps/add
    │       └─ [Redeem Free Wash]  (shown only when stamp_count = 5)
    │           → POST /api/rewards/redeem
    └─ [Dashboard] (admin only)
        ├─ Total customers
        ├─ Total scans today / this week
        ├─ Free washes redeemed
        ├─ Recent activity log
        └─ Manual adjust: search customer, +/- stamps, add note
```

---

## 5. Customer Wallet Card Flow

### Apple Wallet (.pkpass)
```
GET /api/wallet/apple/:customerId
  └─ Server generates .pkpass bundle:
      ├─ pass.json       (stamp count, QR data, colours)
      ├─ icon.png
      ├─ logo.png
      ├─ strip.png       (header image)
      └─ manifest.json + signature (SHA1 hashes)
  └─ Signed with your Apple Developer certificate + WWDR cert
  └─ Returned as application/vnd.apple.pkpass
  └─ iOS auto-prompts "Add to Wallet"
```

**Requires:** Apple Developer Program ($99/yr), Pass Type ID certificate.

### Google Wallet (JWT passes)
```
GET /api/wallet/google/:customerId
  └─ Server creates a Google Wallet "Loyalty Card" object
  └─ Signs a JWT with Google service account key
  └─ Returns a save link: https://pay.google.com/gp/v/save/{jwt}
  └─ Customer taps link → "Add to Google Wallet"
```

**Requires:** Google Cloud project, Wallet API enabled, Issuer ID approved.

### MVP Shortcut (no certs needed)
Use **PassKit.io** or **Walletpasses.io** SaaS APIs:
- Send them pass data via their REST API
- They handle signing for both Apple and Google
- ~$30–50/month for small volumes
- Swap to self-hosted certs once you validate the business

---

## 6. API Endpoints

```
AUTH (Supabase handles)
  POST /auth/login                Staff login (email + password)
  POST /auth/logout

CUSTOMERS
  POST   /api/customers           Register new customer
  GET    /api/customers/:token    Get customer by QR token (public, for card page)
  GET    /api/customers/:id/history  Stamp + reward history (staff only)

STAMPS
  POST   /api/stamps              Add stamp (staff only)
    Body: { customer_token, notes? }
    Guard: last stamp for this customer must be > 5 min ago (duplicate prevention)

REWARDS
  POST   /api/rewards/redeem      Redeem free wash (staff only)
    Body: { customer_id }
    Guard: stamp_count must be >= 5

ADMIN
  GET    /api/admin/customers     List all customers (admin only)
  GET    /api/admin/analytics     Aggregated stats (admin only)
  PATCH  /api/admin/customers/:id Adjust stamp count + add note (admin only)

WALLET
  GET    /api/wallet/apple/:token   Download .pkpass file
  GET    /api/wallet/google/:token  Get Google Wallet save link

HEALTH
  GET    /api/health              { status: 'ok' }
```

---

## 7. Security Rules

| Rule                             | Implementation                                          |
|----------------------------------|---------------------------------------------------------|
| Staff login required             | Supabase JWT verified on every protected route          |
| Admin-only routes                | Middleware checks `staff.role = 'admin'`                |
| QR token is opaque               | 32-byte random hex, not the customer UUID               |
| Duplicate stamp prevention       | Last stamp for customer must be > 5 min old             |
| Rate limiting                    | `express-rate-limit`: 30 req/min per IP on stamp route  |
| Redeem guard                     | API checks stamp_count >= 5 before redeeming            |
| Service-role key server-side only| Never exposed to frontend; all writes via backend API   |
| HTTPS only                       | Enforced at deployment (Render / Railway / Vercel)      |
| Input validation                 | `zod` schemas on all POST bodies                        |
| Audit log                        | Every stamp/redeem/view written to scan_logs            |
| CORS                             | Restricted to your frontend domain                      |

---

## 8. Folder Structure

```
carwash-loyalty/
├── PLAN.md                          ← This file
│
├── backend/                         ← Node.js + Express API
│   ├── package.json
│   ├── .env.example
│   ├── server.js                    ← Entry point
│   ├── middleware/
│   │   ├── auth.js                  ← Verify Supabase JWT
│   │   ├── adminOnly.js             ← Check role = admin
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── customers.js
│   │   ├── stamps.js
│   │   ├── rewards.js
│   │   ├── admin.js
│   │   └── wallet.js
│   ├── services/
│   │   ├── qrService.js             ← QR token + image generation
│   │   ├── appleWallet.js           ← .pkpass builder
│   │   └── googleWallet.js          ← Google Wallet JWT signer
│   └── db/
│       ├── supabase.js              ← Supabase client (service-role)
│       └── migrations/
│           └── 001_initial_schema.sql
│
└── frontend/                        ← Next.js 14 mobile-first web app
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── public/
    │   └── logo.png
    └── src/
        ├── app/
        │   ├── layout.tsx           ← Root layout (dark theme)
        │   ├── page.tsx             ← Landing / customer register
        │   ├── card/
        │   │   └── [token]/
        │   │       └── page.tsx     ← Customer loyalty card view
        │   └── staff/
        │       ├── layout.tsx       ← Auth-gated layout
        │       ├── login/
        │       │   └── page.tsx
        │       ├── scan/
        │       │   └── page.tsx     ← QR scanner + stamp action
        │       └── dashboard/
        │           └── page.tsx     ← Admin analytics
        ├── components/
        │   ├── LoyaltyCard.tsx      ← Visual stamp card
        │   ├── StampGrid.tsx        ← 5-stamp dots display
        │   ├── QRScanner.tsx        ← Camera-based QR reader
        │   ├── CustomerPanel.tsx    ← Post-scan action panel
        │   └── AdminStats.tsx       ← Analytics widgets
        └── lib/
            ├── supabase.ts          ← Supabase browser client (anon key)
            └── api.ts               ← Fetch wrappers for backend API
```

---

## 9. Reward Logic

```
stamp_count  goes 0 → 1 → 2 → 3 → 4 → 5
                                         ↓
                                   FREE WASH available
                                         ↓
                              Staff taps "Redeem"
                                         ↓
                         stamp_count resets to 0
                         total_stamps incremented by 5
                         reward row inserted
                         cycle counter incremented
```

Stamps are never deleted. The `cycle` column on the stamp row records which wash cycle it belongs to. This gives full history: "Customer X has completed 3 loyalty cycles and redeemed 3 free washes."

---

## 10. Development Roadmap

### Phase 1 — Backend Foundation (Week 1)
- [ ] Create Supabase project, run schema migration
- [ ] Create staff user in Supabase Auth (admin + test staff)
- [ ] Scaffold Express server with auth middleware
- [ ] Build `/api/customers` register + lookup endpoints
- [ ] Build `/api/stamps` add endpoint with duplicate guard
- [ ] Build `/api/rewards/redeem` endpoint
- [ ] QR token generation service
- [ ] Test all endpoints with Postman / Insomnia

### Phase 2 — Customer Card (Week 1–2)
- [ ] Next.js project setup with Tailwind (dark navy theme)
- [ ] Build `/card/[token]` page — static loyalty card
- [ ] Build `StampGrid` component (5 circles, filled vs empty)
- [ ] Build QR code display component
- [ ] Build "Add to Apple Wallet" button (server download link)
- [ ] Build "Add to Google Wallet" button (save URL)

### Phase 3 — Staff Scanner App (Week 2)
- [ ] Build `/staff/login` page (Supabase Auth)
- [ ] Build `/staff/scan` page with `html5-qrcode` camera scanner
- [ ] Show `CustomerPanel` after scan (name, stamp count)
- [ ] "Add Stamp" + "Redeem Free Wash" action buttons
- [ ] Confirmation state + success animation

### Phase 4 — Admin Dashboard (Week 2–3)
- [ ] Build `/staff/dashboard` (admin only)
- [ ] Total customers, total stamps, free washes redeemed cards
- [ ] Recent activity table (last 20 scans)
- [ ] Customer search + manual stamp adjustment form

### Phase 5 — Wallet Integration (Week 3–4)
- [ ] **Apple Wallet:** Register at developer.apple.com, create Pass Type ID,
      download certificate, install `passkit-generator`, build pass.json template,
      sign and serve `.pkpass` file
- [ ] **Google Wallet:** Create Google Cloud project, enable Wallet API, create
      Issuer ID, build Loyalty Card class, sign JWT, generate save link
- [ ] **MVP shortcut:** Integrate PassKit.io API if certs are not yet ready

### Phase 6 — Notifications (Week 4)
- [ ] Send SMS via Twilio when customer is registered (with card link)
- [ ] Send stamp confirmation (optional, keep it quiet)
- [ ] Send "You have a free wash!" notification when stamp 5 reached

### Phase 7 — Polish & Deploy (Week 4–5)
- [ ] Deploy backend to Railway or Render (free tier)
- [ ] Deploy frontend to Vercel
- [ ] Custom domain + HTTPS
- [ ] Set Supabase RLS policies in production
- [ ] Final QA on real iPhone (Apple Wallet) and Android (Google Wallet)

---

## What Requires External Accounts

| Feature                  | Requires                                                        | Cost Estimate        |
|--------------------------|-----------------------------------------------------------------|----------------------|
| Apple Wallet passes      | Apple Developer account + Pass Type ID cert                     | $99/yr               |
| Google Wallet passes     | Google Cloud project + Wallet API approval + Issuer ID          | Free (Wallet API)    |
| Wallet shortcut          | PassKit.io or Walletpasses.io account                           | ~$30-50/mo           |
| SMS notifications        | Twilio account + phone number                                   | ~$1-5/mo for MVP     |
| Hosting (backend)        | Railway / Render free tier                                      | $0 (starter)         |
| Hosting (frontend)       | Vercel free tier                                                | $0 (starter)         |
| Database                 | Supabase free tier (up to 500MB, 50K rows)                     | $0 (starter)         |

---
