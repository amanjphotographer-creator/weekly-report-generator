const express = require("express");
const { z } = require("zod");
const router = express.Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { stampLimiter } = require("../middleware/rateLimiter");

const STAMPS_REQUIRED = 5;
const DUPLICATE_WINDOW_MINUTES = 5;

const addStampSchema = z.object({
  customer_token: z.string().min(1),
  notes: z.string().max(200).optional(),
});

// POST /api/stamps — add a stamp to a customer (staff only)
router.post("/", requireAuth, stampLimiter, async (req, res) => {
  const parsed = addStampSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const { customer_token, notes } = parsed.data;

  // Look up the customer
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("id, name, stamp_count, cycle, is_active")
    .eq("qr_token", customer_token)
    .single();

  if (custErr || !customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  if (!customer.is_active) {
    return res.status(403).json({ error: "Customer account is inactive" });
  }

  if (customer.stamp_count >= STAMPS_REQUIRED) {
    return res.status(409).json({
      error: "Customer already has 5 stamps. Please redeem the free wash first.",
      stamp_count: customer.stamp_count,
    });
  }

  // Duplicate scan prevention: last stamp must be > DUPLICATE_WINDOW_MINUTES ago
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { data: recentStamps } = await supabase
    .from("stamps")
    .select("id, stamped_at")
    .eq("customer_id", customer.id)
    .gte("stamped_at", windowStart)
    .limit(1);

  if (recentStamps && recentStamps.length > 0) {
    const lastStampTime = new Date(recentStamps[0].stamped_at);
    const minutesAgo = Math.round((Date.now() - lastStampTime) / 60000);
    return res.status(409).json({
      error: `Stamp already added ${minutesAgo} minute(s) ago. Please wait before adding another.`,
      last_stamp_at: recentStamps[0].stamped_at,
    });
  }

  const newStampCount = customer.stamp_count + 1;

  // Insert stamp + update customer count atomically (two operations; Supabase doesn't
  // support real transactions from the JS client, so we insert stamp first then update)
  const { error: stampErr } = await supabase.from("stamps").insert({
    customer_id: customer.id,
    stamped_by: req.user.id,
    cycle: customer.cycle,
    notes: notes || null,
  });

  if (stampErr) {
    console.error("Insert stamp error:", stampErr);
    return res.status(500).json({ error: "Failed to add stamp" });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("customers")
    .update({ stamp_count: newStampCount, total_stamps: supabase.rpc })
    .eq("id", customer.id)
    .select("id, name, stamp_count, total_stamps, cycle")
    .single();

  // Use raw SQL increment for total_stamps to avoid race conditions
  await supabase.rpc("increment_total_stamps", { customer_id: customer.id });

  if (updateErr) {
    console.error("Update customer stamps error:", updateErr);
    return res.status(500).json({ error: "Stamp inserted but customer count update failed" });
  }

  await supabase.from("scan_logs").insert({
    customer_id: customer.id,
    staff_id: req.user.id,
    action: "stamp",
    ip_address: req.ip,
  });

  res.status(201).json({
    message: "Stamp added successfully",
    stamp_count: newStampCount,
    stamps_remaining: STAMPS_REQUIRED - newStampCount,
    free_wash_available: newStampCount >= STAMPS_REQUIRED,
    customer: { id: customer.id, name: customer.name },
  });
});

module.exports = router;
