import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import urlApiRouter from './src/routes/url.route.js';
import { redirectUrl } from './src/controller/url.controller.js';
import { asyncHandler } from './src/utils/asyncHandler.js';

const app = express();

// only let the frontend hit the api, dont want randome sites calling it
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

// helmet handles all the security headers stuff automatically
app.use(helmet());
app.use(express.static('public'));
app.use(cookieParser());

app.use('/api', urlApiRouter);

// this has to be after /api routes otherwise it would match /api/shorten as an alias
app.get('/:alias', asyncHandler(redirectUrl));

// catch errors and return proper json instead of html error pages
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error',
        errors: err.errors || [],
    });
});

export default app;
