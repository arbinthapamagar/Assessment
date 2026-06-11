// fixed window rate limiter, picked this over sliding window because its simpler
// and honestly for 5 req per minute the edge case doesnt really matter

// in memory store, would need redis if we scale but for now this is fine
const ipStore = new Map();

const LIMIT = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    const entry = ipStore.get(ip);

    // new ip or their window already expired so just reset
    if (!entry || now - entry.windowStart >= WINDOW_MS) {
        ipStore.set(ip, { count: 1, windowStart: now });
        return next();
    }

    if (entry.count < LIMIT) {
        entry.count++;
        return next();
    }

    // hit the limit, calculate how many seconds left and tell them
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);

    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
    });
};

export { rateLimiter };
