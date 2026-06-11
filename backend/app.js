import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import urlApiRouter from './src/routes/url.route.js';
import { redirectUrl } from './src/controller/url.controller.js';
import { asyncHandler } from './src/utils/asyncHandler.js';

const app = express();

// only allow the frontend origin, dont want random sites hitting the api
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

// helmet adds a bunch of security headers automatically, good to have
app.use(helmet());
app.use(express.static('public'));
app.use(cookieParser());

// all the url shortener api stuff lives here
app.use('/api', urlApiRouter);

// redirect route has to come after /api otherwise it would catch /api/* too
app.get('/:alias', asyncHandler(redirectUrl));

// catch any errors that bubble up and send a proper json response
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error',
        errors: err.errors || [],
    });
});

export default app;
