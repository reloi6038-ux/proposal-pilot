const rateLimit = require('express-rate-limit');

// Auth: strict — 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Try again in 15 minutes.' },
});

// AI: 30 requests per hour per IP
// (Credits are the real limiter, but this protects against abuse with zero credits.)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI rate limit reached. Try again later.' },
});

// PayPal: 40 requests per 15 minutes per IP
const paypalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment requests. Try again shortly.' },
});

// Webhook: PayPal retries can burst. Generous limit, but still bounded.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Webhook rate limit exceeded.' },
});

module.exports = { authLimiter, aiLimiter, paypalLimiter, webhookLimiter };