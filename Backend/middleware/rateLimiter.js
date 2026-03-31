import rateLimit from "express-rate-limit";

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress;
};

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    // console.log("LIMIT HIT from:", getClientIp(req));
    res.status(429).json({
      message: "Too many requests, please try again after 1 minute"
    });
  }
});


export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    // console.log("AUTH LIMITER HIT from:", getClientIp(req));
    res.status(429).json({
      message: 'Too many login attempts from this IP, please try again after 10 minutes'
    });
  }
});


