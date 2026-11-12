import rateLimit from "express-rate-limit";

const handler = (_req, res, _next, options) =>
  res
    .status(options.statusCode)
    .json({ success: false, message: options.message });

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: "Too many attempts. Please try again in 15 minutes",
  handler,
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many token refresh requests. Please try again later",
  handler,
});
