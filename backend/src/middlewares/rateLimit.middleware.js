// rateLimiter.js
import { apiError } from '../utils/apiError.js';

// in-memory store: IP -> { count, windowStart }
const ipStore = new Map();

const LIMIT = 5;              // max requests
const WINDOW_MS = 60 * 1000; // per 1 minute

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();

  const entry = ipStore.get(ip);

  // first request from this IP, or the old window has expired
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return next();
  }

  // still inside the window, under the limit
  if (entry.count < LIMIT) {
    entry.count++;
    return next();
  }

  // limit hit — seconds left until the window resets
  const elapsed = now - entry.windowStart;
  const retryAfter = Math.ceil((WINDOW_MS - elapsed) / 1000);

  res.set('Retry-After', String(retryAfter));

  throw new apiError(
    429,
    `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    [{ retryAfter }]
  );
};

export { rateLimiter };