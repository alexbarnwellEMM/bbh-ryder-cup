import { useEffect, useRef, useState } from 'react';

export function useSSE(url) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const retry = useRef(0);
  const esRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.addEventListener('open', () => {
        retry.current = 0;
        setConnected(true);
      });

      es.addEventListener('state', (e) => {
        try {
          const data = JSON.parse(e.data);
          setState(data);
        } catch {}
      });

      es.addEventListener('error', () => {
        setConnected(false);
        es.close();
        if (cancelled) return;
        const wait = Math.min(15000, 500 * 2 ** retry.current);
        retry.current += 1;
        timerRef.current = setTimeout(connect, wait);
      });
    }

    connect();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (esRef.current) esRef.current.close();
    };
  }, [url]);

  return { state, setState, connected };
}
