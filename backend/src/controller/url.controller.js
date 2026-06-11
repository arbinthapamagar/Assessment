import crypto from 'crypto';
import { Url, Click } from '../models/url.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiErrors.js';
import { apiResponse } from '../utils/apiResponse.js';

// sha256 then grab first 6 chars — same url always gives same alias which is nice
// base64url so no +/= chars that would break the route
const generateAlias = (url) => {
    return crypto.createHash('sha256').update(url).digest('base64url').slice(0, 6);
};

// POST /api/shorten
const shortenUrl = asyncHandler(async (req, res) => {
    const { url } = req.body;

    if (!url || !url.trim()) {
        throw new apiError(400, 'URL is required');
    }

    // lazy but this is the easiest url validation without adding a library
    try {
        new URL(url);
    } catch {
        throw new apiError(400, 'Invalid URL format');
    }

    // if they already shortened this url just return what we have, no point creating a duplicate
    const existing = await Url.findOne({ originalUrl: url });
    if (existing) {
        return res.status(200).json(
            new apiResponse(200, {
                alias: existing.alias,
                shortUrl: `${process.env.BASE_URL}/${existing.alias}`,
                originalUrl: existing.originalUrl,
            }, 'URL already shortened')
        );
    }

    let alias = generateAlias(url);

    // collision is super rare with 6 chars but handle it anyway
    // just generate random ones until we find a free slot
    let conflict = await Url.findOne({ alias });
    let attempts = 0;
    while (conflict && attempts < 5) {
        alias = crypto.randomBytes(4).toString('base64url').slice(0, 6);
        conflict = await Url.findOne({ alias });
        attempts++;
    }

    const newUrl = await Url.create({ alias, originalUrl: url });

    return res.status(201).json(
        new apiResponse(201, {
            alias: newUrl.alias,
            shortUrl: `${process.env.BASE_URL}/${newUrl.alias}`,
            originalUrl: newUrl.originalUrl,
        }, 'URL shortened successfully')
    );
});

// GET /:alias
const redirectUrl = asyncHandler(async (req, res) => {
    const { alias } = req.params;

    const urlDoc = await Url.findOne({ alias });
    if (!urlDoc) {
        throw new apiError(404, 'Short URL not found');
    }

    // dont await these, just fire and forget so the redirect is instant
    // if tracking fails its not the end of the world
    Promise.all([
        Click.create({ alias }),
        Url.updateOne({ alias }, { $inc: { totalClicks: 1 } }),
    ]).catch((err) => console.error('click tracking broke:', err));

    return res.redirect(302, urlDoc.originalUrl);
});

// GET /api/urls
const getAllUrls = asyncHandler(async (req, res) => {
    // newest first so the list doesnt feel stale
    const urls = await Url.find({})
        .select('alias originalUrl totalClicks createdAt')
        .sort({ createdAt: -1 });

    return res.status(200).json(new apiResponse(200, urls, 'URLs fetched'));
});

// GET /api/analytics/:alias
const getAnalytics = asyncHandler(async (req, res) => {
    const { alias } = req.params;

    const urlDoc = await Url.findOne({ alias });
    if (!urlDoc) {
        throw new apiError(404, 'Alias not found');
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // group by day string in mongo — way easier than doing it in js after the fact
    const clicks = await Click.aggregate([
        {
            $match: {
                alias,
                createdAt: { $gte: sevenDaysAgo },
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // fill in zeros for days with no clicks so the chart always shows 7 bars
    const dailyClicks = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = clicks.find((c) => c._id === dateStr);
        dailyClicks.push({ date: dateStr, count: found ? found.count : 0 });
    }

    return res.status(200).json(
        new apiResponse(200, {
            alias,
            originalUrl: urlDoc.originalUrl,
            totalClicks: urlDoc.totalClicks,
            dailyClicks,
        }, 'Analytics fetched')
    );
});

export { shortenUrl, redirectUrl, getAllUrls, getAnalytics };
