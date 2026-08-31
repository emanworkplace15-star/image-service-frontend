# Image Service Frontend

Minimal Next.js (App Router) UI:

- `/` — **public** gallery: presigned image URLs, paginated, status badges, live status updates
- `/login` — admin login (JWT kept in localStorage)
- `/upload` — **admin**: presigned direct-to-S3 upload with progress + live "processing done/failed" status
- `/records` — **admin**: paginated table of every DB row

All pages are client components talking to the backend API — no server-side
AWS access at all.

## Realtime notifications

The backend broadcasts `image:processed` / `image:failed` over Socket.IO
(`socket.io-client`, path `/socket.io`, same `NEXT_PUBLIC_API_URL`). While
logged in:

- a toast appears ("Image processed" / "Image failed: …") on any event
- the gallery flips the matching card's badge (and swaps in the fresh
  presigned URL) without a refetch
- the upload page reports the outcome of *its* upload

The JWT rides in the socket handshake `auth` option (native `EventSource`/
`WebSocket` can't set Authorization headers). Logged-out visitors get the
fetch-based gallery but no live updates — the backend rejects unauthenticated
sockets. React Strict Mode double-mounts are handled (pub-sub with proper
unsubscribe cleanup; a single shared socket manager).

## Setup

```bash
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                    # http://localhost:3000
```

Login with the seeded admin (`admin@local` / `admin123`) to use Upload/Records.

## Auth note

The JWT lives in `localStorage` for simplicity. It's fine for an internal
learning project; the tradeoff is XSS exposure vs an httpOnly cookie (which
would need a server-side session layer or a BFF). Redirects to `/login` on 401.

## Docker

```bash
# NEXT_PUBLIC_API_URL is baked into the client bundle at build time:
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t image-service-frontend .
```
