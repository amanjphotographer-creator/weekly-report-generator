-- =========================================================
-- Car Wash Loyalty System — Initial Schema
-- Run this in your Supabase SQL Editor
-- =========================================================

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  phone        TEXT        UNIQUE,
  email        TEXT,
  qr_token     TEXT        UNIQUE NOT NULL,
  stamp_count  INTEGER     NOT NULL DEFAULT 0 CHECK (stamp_count >= 0 AND stamp_count <= 5),
  total_stamps INTEGER     NOT NULL DEFAULT 0 CHECK (total_stamps >= 0),
  cycle        INTEGER     NOT NULL DEFAULT 1,  -- current wash cycle
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STAFF  (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS staff (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STAMPS  (one row per stamp event)
CREATE TABLE IF NOT EXISTS stamps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stamped_by  UUID        NOT NULL REFERENCES auth.users(id),
  stamped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle       INTEGER     NOT NULL,
  notes       TEXT
);

-- REWARDS  (one row per free wash redeemed)
CREATE TABLE IF NOT EXISTS rewards (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  redeemed_by   UUID        NOT NULL REFERENCES auth.users(id),
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle         INTEGER     NOT NULL
);

-- SCAN_LOGS  (audit log + duplicate-scan prevention)
CREATE TABLE IF NOT EXISTS scan_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        REFERENCES customers(id),
  staff_id    UUID        REFERENCES auth.users(id),
  action      TEXT        NOT NULL CHECK (action IN ('stamp', 'redeem', 'view', 'adjust')),
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  TEXT
);

-- ─────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stamps_customer    ON stamps(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamps_stamped_at  ON stamps(stamped_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_customer   ON rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_customer ON scan_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_time     ON scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_qr_token ON customers(qr_token);

-- ─────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────
ALTER TABLE customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs  ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read customers
CREATE POLICY "staff_read_customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated staff can read stamps and rewards
CREATE POLICY "staff_read_stamps"
  ON stamps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "staff_read_rewards"
  ON rewards FOR SELECT
  TO authenticated
  USING (true);

-- Staff can only read their own staff row
CREATE POLICY "staff_read_own_row"
  ON staff FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admin can read all staff rows
CREATE POLICY "admin_read_all_staff"
  ON staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = auth.uid() AND s.role = 'admin'
    )
  );

-- NOTE: All INSERT / UPDATE / DELETE operations go through
-- the backend API using the service-role key, which bypasses RLS.
-- This keeps business logic centralised and auditable.
