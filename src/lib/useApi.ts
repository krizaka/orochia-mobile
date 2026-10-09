import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

/** Loads an API path, with loading, error, pull-to-refresh and a silent reload — the data of one screen. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async () => {
      if (!path) return;
      setRefreshing(true);
      try {
        setData(await api<T>(path));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [path],
  );

  /** Reloads without the pull-to-refresh spinner: polling, and after the viewer's own action. */
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch {
      // A failed background reload keeps what is on screen.
    }
  }, [path]);

  useEffect(() => {
    if (!path) return;
    let live = true;
    api<T>(path)
      .then((d) => live && (setData(d), setError(null)))
      .catch((e: unknown) => live && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [path]);

  return { data, error, loading, refreshing, refresh, reload, setData };
}
