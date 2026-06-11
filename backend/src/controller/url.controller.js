import crypto from 'crypto';
import { Url, Click } from '../models/url.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiErrors.js';
import { apiResponse } from '../utils/apiResponse.js';

// same url always gives same alias which is nice, no duplicates
// base64url so we dont get weird chars like + or / in the url
const generateAlias = (url) => {
    return crypto.createHash('sha256').update(url).digest('base64url').slice(0, 6);
};

// POST /api/shorten
const shortenUrl = asyncHandler(async (req, res) => {
    const { url } = req.body;

    if (!url || !url.trim()) {
        throw new apiError(400, 'URL is required');
    }

    // this is the easiest way to validate a url without adding a whole library for it
    try {
        new URL(url);
    } catch {
        throw new apiError(400, 'Invalid URL format');
    }

    // if we already have this url just return it, no point making a new one
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

    // collision wont happen often but just in case two urls hash to the same 6 chars
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

    // save the click then bump the total count
    await Click.create({ alias });
    await Url.updateOne({ alias }, { $inc: { totalClicks: 1 } });

    return res.redirect(302, urlDoc.originalUrl);
});

// GET /api/urls
const getAllUrls = asyncHandler(async (req, res) => {
    // newest first so you see what you just created at the top
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

    // group by day in mongo, way less painful than doing it in js
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

    // fill zeros for days with no clicks otherwise the chart looks weird with gaps
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
