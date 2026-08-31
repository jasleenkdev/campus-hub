"use client";

import { useCallback, useEffect, useState } from "react";
import { toMessage } from "@/api/client";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Re-runs the loader, e.g. after a mutation or from an error state. */
  reload: () => void;
}

interface InternalState<T> {
  key: string;
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Loads data for a screen, exposing the loading / empty / error states every
 * data view in this app is required to handle.
 *
 * `deps` identify the request the same way useEffect deps do, and must be
 * JSON-serialisable (all call sites pass strings and numbers). Results from a
 * superseded request are discarded, so fast typing in a search box cannot
 * render a stale response.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const key = `${JSON.stringify(deps)}|${nonce}`;

  const [state, setState] = useState<InternalState<T>>({
    key,
    data: null,
    error: null,
    loading: true,
  });

  // Adjusting state during render when the request identity changes — React's
  // documented alternative to resetting it from an effect.
  if (state.key !== key) {
    setState({ key, data: null, error: null, loading: true });
  }

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    loader(controller.signal)
      .then((result) => {
        if (!active) return;
        setState((current) =>
          current.key === key
            ? { key, data: result, error: null, loading: false }
            : current,
        );
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        // A 401 is handled globally by the auth provider (redirect to login);
        // surfacing it here too would just flash on the way out.
        setState((current) =>
          current.key === key
            ? { key, data: null, error: toMessage(caught), loading: false }
            : current,
        );
      });

    return () => {
      active = false;
      controller.abort();
    };
    // `loader` is intentionally excluded: call sites define it inline, so it is
    // a new function every render. `key` is the real request identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    reload,
  };
}
