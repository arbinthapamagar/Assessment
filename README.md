# URL Shortener with Analytics

A rate-limited URL shortener with a click analytics dashboard.

## Running with Docker (easiest)

```bash
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:8000

## Running locally

**Backend** (needs MongoDB running at localhost:27017):

```bash
cd backend
npm install
npm run dev
```

**Frontend:**

```bash
cd frontend/urlShorten
npm install
npm run dev
```

Frontend runs at http://localhost:5173. The vite dev server proxies `/api` calls to the backend automatically.

## How the rate limiter works

Fixed Window algorithm, implemented from scratch in `backend/src/middlewares/rateLimit.middleware.js`.

Each IP address gets a window of 60 seconds with a max of 5 requests. The window start time and request count are stored in a `Map` in memory. When a request comes in, we check if the current time minus `windowStart` is past 60 seconds — if yes, reset the counter. If the count hits 5 within the window, we return `429 Too Many Requests` with a `retryAfter` field (seconds left until the window resets) and a `Retry-After` header.

The UI reads `retryAfter` and runs a live countdown timer so the user knows exactly when they can try again.

## API Endpoints

### POST /api/shorten

Request:
```json
{ "url": "https://example.com/very/long/path" }
```

Response 201:
```json
{
  "success": true,
  "data": {
    "alias": "aB3kZx",
    "shortUrl": "http://localhost:8000/aB3kZx",
    "originalUrl": "https://example.com/very/long/path"
  }
}
```

Response 429:
```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in 42 seconds.",
  "retryAfter": 42
}
```

### GET /:alias

Redirects (302) to the original URL and records a click with a timestamp.

### GET /api/urls

Returns all shortened URLs with total click counts.

Response 200:
```json
{
  "success": true,
  "data": [
    {
      "alias": "aB3kZx",
      "originalUrl": "https://example.com",
      "totalClicks": 12,
      "createdAt": "2026-06-11T10:00:00.000Z"
    }
  ]
}
```

### GET /api/analytics/:alias

Returns click data broken down by day for the last 7 days.

Response 200:
```json
{
  "success": true,
  "data": {
    "alias": "aB3kZx",
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
