const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * Open an SSE connection filtered by emergency request IDs.
 * Auto-reconnects with exponential backoff on failure.
 *
 * @param {string[]} requestIds — UUIDs to subscribe to
 * @param {{ onEvent, onOpen, onError }} handlers
 * @returns {() => void} dispose function
 */
export function createEventStream(requestIds, { onEvent, onOpen, onError } = {}) {
  const ids = requestIds.filter(Boolean).join(",");
  if (!ids) {
    return () => {};
  }

  const url = `${API_BASE}/events/stream?requestIds=${encodeURIComponent(ids)}`;

  let es = null;
  let reconnectTimer = null;
  let reconnectDelay = MIN_RECONNECT_MS;
  let disposed = false;

  function connect() {
    if (disposed) {
      return;
    }

    es = new EventSource(url);

    es.onopen = () => {
      reconnectDelay = MIN_RECONNECT_MS;
      onOpen?.();
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "heartbeat") {
          return;
        }
        onEvent?.(parsed);
      } catch {
        // Ignore malformed frames.
      }
    };

    es.onerror = () => {
      es?.close();
      onError?.();

      if (disposed) {
        return;
      }

      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
        connect();
      }, reconnectDelay);
    };
  }

  connect();

  return () => {
    disposed = true;
    clearTimeout(reconnectTimer);
    es?.close();
  };
}
