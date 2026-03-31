/**
 * SSE client for OPD realtime updates.
 * Auto-reconnects with exponential backoff.
 */
export function createOpdStream(url, { onEvent, onOpen, onError }) {
  let es = null;
  let reconnectDelay = 1000;
  let reconnectTimer = null;
  let closed = false;

  function connect() {
    if (closed) return;
    es = new EventSource(url);

    es.onopen = () => {
      reconnectDelay = 1000;
      onOpen?.();
    };

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== "heartbeat") {
          onEvent?.(event);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      onError?.();
      if (!closed) {
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      }
    };
  }

  connect();

  return function close() {
    closed = true;
    clearTimeout(reconnectTimer);
    es?.close();
  };
}

/**
 * SSE stream for authenticated users (reception/doctor panels).
 * Passes JWT as a query param since EventSource doesn't support custom headers.
 */
export function createAuthStream({ onEvent, onOpen, onError }) {
  try {
    const auth = localStorage.getItem("opd_auth");
    const token = auth ? JSON.parse(auth).token : null;
    if (!token) return { close: () => {} };
    return createOpdStream(`/api/events?token=${encodeURIComponent(token)}`, { onEvent, onOpen, onError });
  } catch {
    return { close: () => {} };
  }
}
