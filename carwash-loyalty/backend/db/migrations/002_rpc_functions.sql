-- =========================================================
-- RPC helper functions
-- Run after 001_initial_schema.sql
-- =========================================================

-- Atomic total_stamps increment (avoids read-modify-write race)
CREATE OR REPLACE FUNCTION increment_total_stamps(customer_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE customers
  SET total_stamps = total_stamps + 1
  WHERE id = customer_id;
$$;
