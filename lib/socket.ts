// Singleton Socket.IO connection to the backend, plus a tiny pub-sub so any
// component can subscribe to image lifecycle events without touching the
// socket directly.
//
// Auth: the JWT rides in the socket.io handshake `auth` option (native
// EventSource/WebSocket can't set Authorization headers). Connections are
// only made when a token exists — logged-out visitors don't get live
// notifications.
//
// Every lifecycle transition is logged to the console with a `[socket]`
// prefix, in dev and prod, so the connection state is always visible.

import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const IMAGE_PROCESSED_EVENT = 'image:processed';
export const IMAGE_FAILED_EVENT = 'image:failed';

export interface RealtimeProcessedEvent {
  id: string;
  originalKey: string;
  processedKey?: string | null;
  processedSize?: number | null;
  url?: string | null;
  occurredAt?: string;
}

export interface RealtimeFailedEvent {
  id: string;
  originalKey: string;
  failureReason?: string;
  occurredAt?: string;
}

type ImageEventHandler = (payload: any) => void;

function log(message: string, ...extra: unknown[]) {
  console.log(`[socket] ${message}`, ...extra);
}

let socket: Socket | null = null;
const handlers = new Map<string, Set<ImageEventHandler>>();
let authListenerRegistered = false;

function connect(): void {
  const token = getToken();
  if (!token) {
    log('no token — not connecting (live updates need login)');
    return;
  }
  if (socket) return;

  log('connecting to', API_URL, '…');
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => log('connected ✓ (id', socket!.id + ')'));
  socket.on('disconnect', (reason: string) =>
    log('disconnected:', reason, reason === 'io server disconnect'
      ? '(rejected: bad/missing token?)'
      : '(will auto-reconnect)'),
  );
  socket.io.on('reconnect_attempt', (attempt: number) =>
    log(`reconnect attempt #${attempt}…`));

  // Failed handshakes (expired token, backend down) are logged loudly but
  // socket.io keeps retrying — no silent death, no redirect (the fetch
  // wrapper owns auth redirects).
  socket.on('connect_error', (err: Error) =>
    console.warn('[socket] connection error:', err.message));

  for (const event of [IMAGE_PROCESSED_EVENT, IMAGE_FAILED_EVENT]) {
    socket.on(event, (payload: unknown) => {
      log(`event received: ${event}`, payload);
      for (const handler of handlers.get(event) ?? []) handler(payload);
    });
  }
}

// Re-login/logout mid-session: tear down and reconnect with the fresh token.
// Registered at first subscription (not inside connect()) so a login that
// happens *after* the initial logged-out page view still opens the socket.
function registerAuthListener(): void {
  if (authListenerRegistered || typeof window === 'undefined') return;
  window.addEventListener('auth-changed', () => {
    if (socket) {
      log('token changed — reconnecting');
      socket.disconnect();
      socket = null;
    }
    connect();
  });
  authListenerRegistered = true;
}

export function onImageEvent(
  event: typeof IMAGE_PROCESSED_EVENT | typeof IMAGE_FAILED_EVENT,
  handler: ImageEventHandler,
): () => void {
  if (typeof window === 'undefined') return () => {};
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  registerAuthListener();
  connect();
  return () => offImageEvent(event, handler);
}

export function offImageEvent(
  event: typeof IMAGE_PROCESSED_EVENT | typeof IMAGE_FAILED_EVENT,
  handler: ImageEventHandler,
): void {
  handlers.get(event)?.delete(handler);
}