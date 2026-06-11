import { Router } from 'express';
import { shortenUrl, getAllUrls, getAnalytics } from '../controller/url.controller.js';
import { rateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// only shorten needs rate limiting, no point adding it to read endpoints
router.post('/shorten', rateLimiter, shortenUrl);
router.get('/urls', getAllUrls);
router.get('/analytics/:alias', getAnalytics);

export default router;
