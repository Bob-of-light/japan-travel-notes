import { useCallback, useEffect, useState } from 'react';
import { loadSpots, saveSpots, WRITE_API } from '../api/spots';
import type { Spot, SpotsData, SpotsSettings } from '../types';

const EMPTY: SpotsData = { version: 1, categories: [], spots: [], settings: { origin: '' } };

export type EditMode = 'offline' | 'locked' | 'unlocked';

export function useSpots() {
  const [data, setData] = useState<SpotsData>(EMPTY);
  const [editable, setEditable] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('offline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSpots()
      .then((res) => {
        if (cancelled) return;
        setData({ settings: { origin: '' }, ...res.data });
        setEditable(res.editable);
        // 線上模式要輸入密碼才能寫入
        setEditMode(res.editable && WRITE_API ? 'locked' : res.editable ? 'unlocked' : 'offline');
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

  const unlock = useCallback(() => {
    setEditMode('unlocked');
    setEditable(true);
  }, []);

  const persist = useCallback(async (next: SpotsData, message?: string) => {
    const saved = await saveSpots(next, message);
    setData(saved);
    return saved;
  }, []);

  const updateSpot = useCallback(
    async (spot: Spot, message?: string) => {
      const next: SpotsData = {
        ...data,
        spots: data.spots.map((s) => (s.id === spot.id ? spot : s)),
      };
      return persist(next, message ?? `修改「${spot.name}」`);
    },
    [data, persist],
  );

  const addSpot = useCallback(
    async (spot: Spot, message?: string) => {
      if (data.spots.some((s) => s.id === spot.id)) {
        throw new Error(`景點 id 重複：${spot.id}`);
      }
      const categories = [...data.categories];
      for (const cat of spot.categories) {
        if (!categories.includes(cat)) categories.push(cat);
      }
      const next: SpotsData = { ...data, categories, spots: [...data.spots, spot] };
      return persist(next, message ?? `新增「${spot.name}」`);
    },
    [data, persist],
  );

  const saveSettings = useCallback(
    async (settings: SpotsSettings) => {
      const next: SpotsData = { ...data, settings };
      return persist(next, '更新出發地設定');
    },
    [data, persist],
  );

  return { data, editable, editMode, loading, error, unlock, updateSpot, addSpot, saveSettings };
}