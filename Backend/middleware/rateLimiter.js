import rateLimit from "express-rate-limit";

// Key by user ID (from JWT token) when available — prevents shared-IP blocking
// (All users behind a NAT or proxy would share the same IP)
const getUserKey = (req) => {
  try {
    // Try Authorization header first
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      // Decode payload (not verify — rate limiter doesn't need full auth)
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString()
      );
      if (payload?.userId || payload?.id || payload?._id) {
        return `user_${payload.userId || payload.id || payload._id}`;
      }
    }
    // Fallback: IP address
    const forwarded = req.headers["x-forwarded-for"];
    return forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
  } catch {
    const forwarded = req.headers["x-forwarded-for"];
    return forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
  }
};

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 300,                   // 300 requests/min per user (supports active chat + video)
  keyGenerator: getUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests, please slow down."
    });
  }
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 20,                    // 20 login attempts per 10 min
  keyGenerator: getUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many login attempts, please try again after 10 minutes'
    });
  }
});
