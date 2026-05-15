// Lightweight auth event bus so non-React modules (graphql-client, timers)
// can request a client-side navigation instead of doing a full page reload.

type AuthEvent =
  | { type: 'logout-redirect'; redirectTo: string }
  | { type: 'session-expired' };

type Listener = (event: AuthEvent) => void;

const listeners = new Set<Listener>();

export function onAuthEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAuthEvent(event: AuthEvent): void {
  listeners.forEach((l) => {
    try {
      l(event);
    } catch {
      // ignore listener errors
    }
  });
}
