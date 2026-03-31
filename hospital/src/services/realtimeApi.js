import { API_BASE_URL } from './apiClient';

export function connectRealtimeEvents(token, onMessage, onError) {
  if (!token) {
    return () => {};
  }

  const url = `${API_BASE_URL}/events?token=${encodeURIComponent(token)}`;
  const stream = new EventSource(url);

  stream.onmessage = (event) => {
    if (!event?.data) {
      return;
    }
    try {
      const parsed = JSON.parse(event.data);
      onMessage?.(parsed);
    } catch {
      // Ignore malformed frames.
    }
  };

  stream.onerror = (error) => {
    onError?.(error);
  };

  return () => {
    stream.close();
  };
}
