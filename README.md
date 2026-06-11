# URL Shortener with Analytics

A rate limited url shortener with a click analytics dashboard. Built with Express + MongoDB on the backend and React on the frontend.

## Running with Docker (easiest way)

```bash
docker compose up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000

## Running locally

You need MongoDB running on localhost:27017 first.

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend/urlShorten
npm install
npm run dev
```

Frontend runs at http://localhost:5173, the vite dev server proxies /api calls to the backend so no CORS issues in dev.

## How the rate limiter works

I went with the Fixed Window algorithm, written from scratch in `backend/src/middlewares/rateLimit.middleware.js` (no rate limiting library used).

Basically every IP gets a 60 second window with max 5 requests. I keep a Map in memory where the key is the IP and the value is the request count + when the window started. On each request I check if 60 seconds passed since the window started, if yes the counter resets. If the count is already at 5 inside the window, the api returns `429 Too Many Requests` with a `retryAfter` field telling how many seconds are left until the window resets (also sent as a `Retry-After` header).

The frontend reads `retryAfter` from the 429 response and shows a live countdown so the user knows when they can try again.

Note: since the store is in memory it resets when the server restarts. For a real production setup with multiple instances this would need redis, but for this assessment in memory is enough.

## API Endpoints

### POST /api/shorten

Shortens a url. Rate limited to 5 per minute per IP.

Request:
```json
{ "url": "https://example.com/very/long/path" }
```

Response 201:
```json
{
  "success": true,
  "data": {
    "alias": "a3f9c2",
    "shortUrl": "http://localhost:8000/a3f9c2",
    "originalUrl": "https://example.com/very/long/path"
  }
}
```

Response 429 (rate limited):
```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in 42 seconds.",
  "retryAfter": 42
}
```

### GET /:alias

Redirects (302) to the original url and saves the click with a timestamp.

### GET /api/urls

Returns all shortened urls with their total click counts, newest first.

Response 200:
```json
{
  "success": true,
  "data": [
    {
      "alias": "a3f9c2",
      "originalUrl": "https://example.com",
      "totalClicks": 12,
      "createdAt": "2026-06-11T10:00:00.000Z"
    }
  ]
}
```

### GET /api/analytics/:alias

Returns clicks per day for the last 7 days. Days with no clicks come back as 0 so the chart doesnt have gaps.

Response 200:
```json
{
  "success": true,
  "data": {
    "alias": "a3f9c2",
    "originalUrl": "https://example.com",
    "totalClicks": 12,
    "dailyClicks": [
      { "date": "2026-06-05", "count": 0 },
      { "date": "2026-06-06", "count": 3 },
      { "date": "2026-06-07", "count": 5 },
      { "date": "2026-06-08", "count": 4 },
      { "date": "2026-06-09", "count": 0 },
      { "date": "2026-06-10", "count": 0 },
      { "date": "2026-06-11", "count": 0 }
    ]
  }
}
```
