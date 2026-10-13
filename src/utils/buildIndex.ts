import type { IndexBranch, IndexMode, IndexNode, IndexTree, Spot, SpotsData } from '../types';

const UNCATEGORIZED = '未分類';
const NO_AREA = '未分區';

function matches(spot: Spot, keyword: string) {
  const k = keyword.trim().toLowerCase();
  if (!k) return true;
  return [spot.name, spot.nameJa, spot.area, spot.address, ...spot.categories]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(k));
}

/** 遞迴累加筆數，並移除底下完全沒有景點的分支 */
function prune(nodes: IndexNode[]): IndexNode[] {
  const result: IndexNode[] = [];
  for (const node of nodes) {
    if (node.kind === 'spot') {
      result.push(node);
      continue;
    }
    const children = prune(node.children);
    if (children.length === 0) continue;
    const count = children.reduce((sum, child) => sum + child.count, 0);
    result.push({ ...node, count, children });
  }
  return result;
}

function childBranch(parent: IndexBranch, name: string): IndexBranch {
  const found = parent.children.find(
    (c): c is IndexBranch => c.kind === 'branch' && c.name === name,
  );
  if (found) return found;
  const created: IndexBranch = { kind: 'branch', name, count: 0, children: [] };
  parent.children.push(created);
  return created;
}

const categoriesOf = (spot: Spot) => (spot.categories.length ? spot.categories : [UNCATEGORIZED]);
const areaOf = (spot: Spot) => spot.area || NO_AREA;

export function buildIndex(data: SpotsData, mode: IndexMode, keyword = ''): IndexTree {
  const spots = data.spots.filter((spot) => matches(spot, keyword));
  const roots: IndexBranch[] = [];

  if (mode === 'category') {
    const known = [...data.categories];
    for (const spot of spots) {
      for (const cat of categoriesOf(spot)) {
        if (!known.includes(cat)) known.push(cat);
      }
    }
    for (const name of known) roots.push({ kind: 'branch', name, count: 0, children: [] });

    for (const root of roots) {
      for (const spot of spots) {
        if (!categoriesOf(spot).includes(root.name)) continue;
        const areaNode = childBranch(root, areaOf(spot));
        areaNode.children.push({ kind: 'spot', spot, count: 1 });
      }
    }
  } else {
    const areas = [...new Set(spots.map(areaOf))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    for (const name of areas) roots.push({ kind: 'branch', name, count: 0, children: [] });

    for (const root of roots) {
      for (const spot of spots) {
        if (areaOf(spot) !== root.name) continue;
        for (const cat of categoriesOf(spot)) {
          const catNode = childBranch(root, cat);
          catNode.children.push({ kind: 'spot', spot, count: 1 });
        }
      }
    }
  }

  return { mode, roots: prune(roots) as IndexBranch[], total: spots.length };
}