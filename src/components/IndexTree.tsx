import { useState } from 'react';
import type { IndexBranch, IndexNode } from '../types';
import { ChevronIcon } from './icons';

interface IndexTreeProps {
  nodes: IndexNode[];
  selectedId: string | null;
  onSelect: (spotId: string) => void;
  level?: number;
}

export default function IndexTree({ nodes, selectedId, onSelect, level = 0 }: IndexTreeProps) {
  return (
    <ul className={level === 0 ? 'space-y-0.5' : 'mt-0.5 ml-2 space-y-0.5 border-l border-line pl-1'}>
      {nodes.map((node, i) =>
        node.kind === 'spot' ? (
          <li key={`${node.spot.id}-${i}`}>
            <SpotRow
              name={node.spot.name}
              level={level}
              selected={node.spot.id === selectedId}
              onSelect={() => onSelect(node.spot.id)}
            />
          </li>
        ) : (
          <li key={`${node.name}-${i}`}>
            <BranchRow
              node={node}
              level={level}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </li>
        ),
      )}
    </ul>
  );
}

function BranchRow({
  node,
  level,
  selectedId,
  onSelect,
}: {
  node: IndexBranch;
  level: number;
  selectedId: string | null;
  onSelect: (spotId: string) => void;
}) {
  const [open, setOpen] = useState(level < 2);
  const containsSelected = containsSpot(node, selectedId);

  return (
    <div>
      <div
        className={`flex items-center rounded-md transition-colors ${
          containsSelected
            ? 'bg-sky-50 dark:bg-sky-950/50'
            : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="py-1.5 pl-0.5 pr-0.5 text-muted hover:text-current"
          aria-label={open ? `收合 ${node.name}` : `展開 ${node.name}`}
          aria-expanded={open}
        >
          <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-2 py-1.5 pr-2 text-left min-w-0"
        >
          <span
            className={`truncate text-sm ${
              level === 0 ? 'font-medium' : 'text-muted'
            } ${containsSelected ? 'accent' : ''}`}
          >
            {node.name}
          </span>
          <span className="text-[10px] tabular-nums text-muted shrink-0">{node.count}</span>
        </button>
      </div>
      {open && <IndexTree nodes={node.children} selectedId={selectedId} onSelect={onSelect} level={level + 1} />}
    </div>
  );
}

function SpotRow({
  name,
  level,
  selected,
  onSelect,
}: {
  name: string;
  level: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-md py-1.5 pr-2 text-sm transition-colors ${
        selected
          ? 'bg-sky-100 dark:bg-sky-950 font-medium accent'
          : 'text-muted hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 hover:text-current'
      }`}
    >
      <span className={`truncate block ${level === 1 ? '' : 'pl-1'}`}>{name}</span>
    </button>
  );
}

function containsSpot(node: IndexBranch, spotId: string | null): boolean {
  if (!spotId) return false;
  if (node.children.some((c) => c.kind === 'spot' && c.spot.id === spotId)) return true;
  return node.children.some((c) => c.kind === 'branch' && containsSpot(c, spotId));
}