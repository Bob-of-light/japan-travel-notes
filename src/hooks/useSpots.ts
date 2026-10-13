import { useCallback, useEffect, useState } from 'react';
import { loadSpots, saveSpots } from '../api/spots';
import type { Spot, SpotsData } from '../types';

const EMPTY: SpotsData = { version: 1, categories: [], spots: [] };

export function useSpots() {
  const [data, setData] = useState<SpotsData>(EMPTY);
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSpots()
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setEditable(res.editable);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSpot = useCallback(async (spot: Spot) => {
    const next: SpotsData = {
      ...data,
      spots: data.spots.map((s) => (s.id === spot.id ? spot : s)),
    };
    const saved = await saveSpots(next);
    setData(saved);
    return saved;
  }, [data]);

  const saveData = useCallback(async (next: SpotsData) => {
    const saved = await saveSpots(next);
    setData(saved);
    return saved;
  }, []);

  return { data, editable, loading, error, updateSpot, saveData, setError };
}