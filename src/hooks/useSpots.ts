import { useCallback, useEffect, useState } from 'react';
import { loadSpots, saveSpots } from '../api/spots';
import type { Spot, SpotsData, SpotsSettings } from '../types';

const EMPTY: SpotsData = { version: 1, categories: [], spots: [], settings: { origin: '' } };

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
        setData({ settings: { origin: '' }, ...res.data });
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

  const updateSpot = useCallback(
    async (spot: Spot) => {
      const next: SpotsData = {
        ...data,
        spots: data.spots.map((s) => (s.id === spot.id ? spot : s)),
      };
      const saved = await saveSpots(next);
      setData(saved);
      return saved;
    },
    [data],
  );

  const addSpot = useCallback(
    async (spot: Spot) => {
      if (data.spots.some((s) => s.id === spot.id)) {
        throw new Error(`景點 id 重複：${spot.id}`);
      }
      // 順手把沒登記過的分類補進清單，索引才不會漏掉
      const categories = [...data.categories];
      for (const cat of spot.categories) {
        if (!categories.includes(cat)) categories.push(cat);
      }

      const next: SpotsData = { ...data, categories, spots: [...data.spots, spot] };
      const saved = await saveSpots(next);
      setData(saved);
      return saved;
    },
    [data],
  );

  const saveSettings = useCallback(
    async (settings: SpotsSettings) => {
      const next: SpotsData = { ...data, settings };
      const saved = await saveSpots(next);
      setData(saved);
      return saved;
    },
    [data],
  );

  return { data, editable, loading, error, updateSpot, addSpot, saveSettings };
}