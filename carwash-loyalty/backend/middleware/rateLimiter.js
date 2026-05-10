const rateLimit = require("express-rate-limit");

// Applied to stamp + redeem routes to prevent abuse
const stampLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

module.exports = { stampLimiter };
