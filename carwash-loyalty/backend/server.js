require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const customersRouter = require("./routes/customers");
const stampsRouter   = require("./routes/stamps");
const rewardsRouter  = require("./routes/rewards");
const adminRouter    = require("./routes/admin");
const walletRouter   = require("./routes/wallet");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: "512kb" }));

// ── Global rate limiter ───────────────────────────────────────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/customers", customersRouter);
app.use("/api/stamps",    stampsRouter);
app.use("/api/rewards",   rewardsRouter);
app.use("/api/admin",     adminRouter);
app.use("/api/wallet",    walletRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Car Wash Loyalty API → http://localhost:${PORT}`);
});
