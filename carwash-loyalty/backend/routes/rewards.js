const express = require("express");
const { z } = require("zod");
const router = express.Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { stampLimiter } = require("../middleware/rateLimiter");

const STAMPS_REQUIRED = 5;

const redeemSchema = z.object({
  customer_token: z.string().min(1),
});

// POST /api/rewards/redeem — redeem free wash (staff only)
router.post("/redeem", requireAuth, stampLimiter, async (req, res) => {
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const { customer_token } = parsed.data;

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

  if (customer.stamp_count < STAMPS_REQUIRED) {
    return res.status(409).json({
      error: `Customer only has ${customer.stamp_count} stamps. ${STAMPS_REQUIRED} required for a free wash.`,
      stamp_count: customer.stamp_count,
    });
  }

  // Insert reward record
  const { error: rewardErr } = await supabase.from("rewards").insert({
    customer_id: customer.id,
    redeemed_by: req.user.id,
    cycle: customer.cycle,
  });

  if (rewardErr) {
    console.error("Insert reward error:", rewardErr);
    return res.status(500).json({ error: "Failed to record reward redemption" });
  }

  // Reset stamps, increment cycle
  const { error: updateErr } = await supabase
    .from("customers")
    .update({ stamp_count: 0, cycle: customer.cycle + 1 })
    .eq("id", customer.id);

  if (updateErr) {
    console.error("Reset stamps error:", updateErr);
    return res.status(500).json({ error: "Reward recorded but stamp reset failed" });
  }

  await supabase.from("scan_logs").insert({
    customer_id: customer.id,
    staff_id: req.user.id,
    action: "redeem",
    ip_address: req.ip,
  });

  res.json({
    message: "Free wash redeemed successfully! Stamps reset.",
    customer: { id: customer.id, name: customer.name },
    cycle_completed: customer.cycle,
    new_cycle: customer.cycle + 1,
  });
});

module.exports = router;
