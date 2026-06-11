import { Router } from 'express';
import { shortenUrl, getAllUrls, getAnalytics } from '../controller/url.controller.js';
import { rateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// rate limiter only on shorten — no reason to limit reads
router.post('/shorten', rateLimiter, shortenUrl);
router.get('/urls', getAllUrls);
router.get('/analytics/:alias', getAnalytics);

export default router;
