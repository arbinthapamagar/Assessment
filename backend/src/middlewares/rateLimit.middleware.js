// Fixed Window limiter — i chose this over sliding window because its simpler
// and for this use case the edge case at window boundaries doesnt really matter

// storing in memory for now, would need redis if we ever run multiple instances
const ipStore = new Map();

const LIMIT = 5;
const WINDOW_MS = 60 * 1000; // 1 min

const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    const entry = ipStore.get(ip);

    // first time we see this ip, or their window expired — reset everything
    if (!entry || now - entry.windowStart >= WINDOW_MS) {
        ipStore.set(ip, { count: 1, windowStart: now });
        return next();
    }

    if (entry.count < LIMIT) {
        entry.count++;
        return next();
    }

    // they hit the limit, tell them how long to wait
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);

    res.set('Retry-After', String(retryAfter)); // standard header so clients can use it
    return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
    });
};

export { rateLimiter };
