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

  const persist = useCallback(
    async (next: SpotsData, message?: string) => {
      // 把景點用到、但主清單還沒有的分類補進去（新增與修改都會經過這裡）
      const categories = [...next.categories];
      for (const spot of next.spots) {
        for (const cat of spot.categories) {
          if (!categories.includes(cat)) categories.push(cat);
        }
      }

      const saved = await saveSpots({ ...next, categories }, message);
      setData(saved);
      return saved;
    },
    [],
  );

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
      const next: SpotsData = { ...data, spots: [...data.spots, spot] };
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

  /** 只把分類加進主清單，不建立任何景點 */
  const createCategory = useCallback(
    async (name: string) => {
      if (!name) throw new Error('分類名稱不能空白');
      if (name.length > 12) throw new Error('分類名稱請控制在 12 個字以內');
      if (data.categories.includes(name)) throw new Error(`「${name}」已經存在了`);

      const next: SpotsData = { ...data, categories: [...data.categories, name] };
      return persist(next, `新增分類「${name}」`);
    },
    [data, persist],
  );

  /** 重新命名分類：主清單與所有景點一起改 */
  const renameCategory = useCallback(
    async (from: string, to: string) => {
      const name = to.trim();
      if (!name) throw new Error('分類名稱不能空白');
      if (name.length > 12) throw new Error('分類名稱請控制在 12 個字以內');
      if (name === from) return;
      if (data.categories.includes(name)) throw new Error(`「${name}」已經存在了`);

      const next: SpotsData = {
        ...data,
        categories: data.categories.map((c) => (c === from ? name : c)),
        spots: data.spots.map((s) =>
          s.categories.includes(from)
            ? { ...s, categories: s.categories.map((c) => (c === from ? name : c)) }
            : s,
        ),
      };
      return persist(next, `分類「${from}」改名為「${name}」`);
    },
    [data, persist],
  );

  /** 刪除分類：主清單與所有景點上的標籤一起移除 */
  const deleteCategory = useCallback(
    async (name: string) => {
      const affected = data.spots.filter((s) => s.categories.includes(name)).length;

      const next: SpotsData = {
        ...data,
        categories: data.categories.filter((c) => c !== name),
        spots: data.spots.map((s) =>
          s.categories.includes(name)
            ? { ...s, categories: s.categories.filter((c) => c !== name) }
            : s,
        ),
      };
      return persist(next, `刪除分類「${name}」（影響 ${affected} 個景點）`);
    },
    [data, persist],
  );

  return {
    data,
    editable,
    editMode,
    loading,
    error,
    unlock,
    updateSpot,
    addSpot,
    saveSettings,
    createCategory,
    renameCategory,
    deleteCategory,
  };
}