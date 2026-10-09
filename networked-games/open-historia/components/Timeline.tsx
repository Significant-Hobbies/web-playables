import { isTimelineMemory } from '@/lib/timeline-memory';
import { createPortal } from 'react-dom';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GameEvent, TimelineSnapshot } from '@/lib/types';
import { diffTimelineSnapshots } from '@/lib/state-diff';

interface TimelineProps {
  snapshots: TimelineSnapshot[];
  currentYear: number;
  activeSnapshotId?: string | null;
  onRewind: (snapshotId: string) => void;
  onBranch: (snapshotId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifySnapshot(
  snapshot: TimelineSnapshot
): 'war' | 'diplomacy' | 'discovery' | 'economy' | 'default' {
  const events = snapshot.gameStateSlim.events;
  if (events.some((e: GameEvent) => e.type === 'war' || e.type === 'crisis')) return 'war';
  if (events.some((e: GameEvent) => e.type === 'diplomacy')) return 'diplomacy';
  if (events.some((e: GameEvent) => e.type === 'discovery')) return 'discovery';
  if (events.some((e: GameEvent) => e.type === 'economy')) return 'economy';
  return 'default';
}

const NODE_COLORS: Record<string, { fill: string; glow: string; badge: string }> = {
  war: { fill: 'bg-rose-500', glow: 'shadow-rose-500/60', badge: 'text-rose-400' },
  diplomacy: { fill: 'bg-sky-500', glow: 'shadow-sky-500/60', badge: 'text-sky-400' },
  discovery: { fill: 'bg-emerald-500', glow: 'shadow-emerald-500/60', badge: 'text-emerald-400' },
  economy: { fill: 'bg-amber-400', glow: 'shadow-amber-400/60', badge: 'text-amber-400' },
  default: { fill: 'bg-slate-400', glow: 'shadow-slate-400/40', badge: 'text-slate-400' },
};

const EVENT_TYPE_STYLES: Record<GameEvent['type'], { badge: string; border: string }> = {
  war: { badge: 'text-rose-400', border: 'border-rose-500/30' },
  crisis: { badge: 'text-rose-400', border: 'border-rose-500/30' },
  diplomacy: { badge: 'text-sky-400', border: 'border-sky-500/30' },
  discovery: { badge: 'text-emerald-400', border: 'border-emerald-500/30' },
  economy: { badge: 'text-amber-400', border: 'border-amber-500/30' },
  flavor: { badge: 'text-slate-400', border: 'border-slate-600/50' },
};

function clampHorizontal(centerX: number, panelWidth: number, padding = 12): number {
  if (typeof window === 'undefined') return centerX;
  const half = panelWidth / 2;
  return Math.max(padding + half, Math.min(window.innerWidth - padding - half, centerX));
}

function EventCard({ event, compact = false }: { event: GameEvent; compact?: boolean }) {
  const style = EVENT_TYPE_STYLES[event.type];
  return (
    <div
      className={`rounded border ${style.border} bg-slate-950/50 px-2 py-1 ${compact ? '' : 'mb-1 last:mb-0'}`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`text-[8px] uppercase font-bold tracking-wide ${style.badge}`}>
          {event.type}
        </span>
        <span className="text-slate-600 text-[8px]">Y{event.year}</span>
      </div>
      <p
        className={`text-slate-300 leading-snug ${compact ? 'text-[10px] line-clamp-2' : 'text-[11px]'}`}
      >
        {event.description}
      </p>
    </div>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026';
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Detect branch structure
// ---------------------------------------------------------------------------

type BranchInfo = {
  branchId: string;
  parentNodeId: string | null;
  nodeIds: string[];
};

function buildBranches(snapshots: TimelineSnapshot[]): BranchInfo[] {
  if (snapshots.length === 0) return [];

  const byId = new Map(snapshots.map((s) => [s.id, s]));
  const childrenOf = new Map<string | null, TimelineSnapshot[]>();

  for (const snap of snapshots) {
    const parentId = snap.parentSnapshotId;
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId)!.push(snap);
  }

  const branches: BranchInfo[] = [];
  let branchCounter = 0;

  // Find root nodes (parentSnapshotId === null or parent not in set)
  const roots = snapshots.filter(
    (s) => s.parentSnapshotId === null || !byId.has(s.parentSnapshotId)
  );

  function walk(node: TimelineSnapshot, currentBranch: BranchInfo) {
    currentBranch.nodeIds.push(node.id);
    const children = childrenOf.get(node.id) || [];

    if (children.length === 0) return;

    // First child continues the branch
    walk(children[0], currentBranch);

    // Additional children start new branches (forks)
    for (let i = 1; i < children.length; i++) {
      branchCounter++;
      const newBranch: BranchInfo = {
        branchId: `branch-${branchCounter}`,
        parentNodeId: node.id,
        nodeIds: [],
      };
      branches.push(newBranch);
      walk(children[i], newBranch);
    }
  }

  for (const root of roots) {
    branchCounter++;
    const branch: BranchInfo = {
      branchId: `branch-${branchCounter}`,
      parentNodeId: null,
      nodeIds: [],
    };
    branches.push(branch);
    walk(root, branch);
  }

  return branches;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ZOOM_LEVELS: Record<'compact' | 'normal' | 'wide', number> = {
  compact: 120,
  normal: 140,
  wide: 220,
};
const NODE_RADIUS = 7;
const CURRENT_RADIUS = 11;
const BRANCH_VERTICAL_GAP = 80;
// Coordinates are relative to the scrollable graph below the controls.
const TRACK_Y = 24;

export default function Timeline({
  snapshots,
  currentYear,
  activeSnapshotId,
  onRewind,
  onBranch,
}: TimelineProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<'compact' | 'normal' | 'wide'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 'compact';
    return 'normal';
  });
  const nodeSpacing = ZOOM_LEVELS[zoom];
  const scrollRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  // Determine the last snapshot in the primary branch as "current"
  const branches = useMemo(() => buildBranches(snapshots), [snapshots]);
  const primaryBranch = branches[0] || null;
  const graphHeight = Math.max(80, branches.length * BRANCH_VERTICAL_GAP);
  const panelHeight = Math.min(240, 56 + graphHeight);
  const currentSnapshotId =
    activeSnapshotId ??
    (primaryBranch ? primaryBranch.nodeIds[primaryBranch.nodeIds.length - 1] : null);

  // Build a lookup: snapshotId -> { branchIndex, positionInBranch }
  const layout = useMemo(() => {
    const map = new Map<string, { x: number; y: number; branchIdx: number; posIdx: number }>();

    branches.forEach((branch, bIdx) => {
      let startX = 0;

      // If this branch forks from a parent, start its x from the parent node position
      if (branch.parentNodeId && map.has(branch.parentNodeId)) {
        startX = map.get(branch.parentNodeId)!.x;
      }

      const y = TRACK_Y + bIdx * BRANCH_VERTICAL_GAP;

      branch.nodeIds.forEach((nid, posIdx) => {
        map.set(nid, {
          x: startX + posIdx * nodeSpacing + nodeSpacing, // 1-indexed offset
          y,
          branchIdx: bIdx,
          posIdx,
        });
      });
    });

    return map;
  }, [branches, nodeSpacing]);

  const totalWidth = useMemo(() => {
    let max = 0;
    layout.forEach((pos) => {
      if (pos.x > max) max = pos.x;
    });
    return max + nodeSpacing;
  }, [layout, nodeSpacing]);

  const scrollToSnapshot = useCallback(
    (snapshotId: string) => {
      if (!scrollRef.current) return;
      const pos = layout.get(snapshotId);
      if (!pos) return;
      scrollRef.current.scrollTo({
        left: pos.x - scrollRef.current.clientWidth / 2,
        top: pos.y - TRACK_Y,
        behavior: 'smooth',
      });
    },
    [layout]
  );

  // Auto-scroll to the current node when it changes (or when zoom changes)
  useEffect(() => {
    if (!currentSnapshotId) return;
    scrollToSnapshot(currentSnapshotId);
  }, [currentSnapshotId, scrollToSnapshot]);

  // Keyboard navigation through primary branch when timeline is focused
  const stepThroughPrimary = useCallback(
    (direction: 1 | -1) => {
      if (!primaryBranch || primaryBranch.nodeIds.length === 0) return;
      const focusedId = activeId ?? hoveredId ?? currentSnapshotId;
      const ids = primaryBranch.nodeIds;
      const idx = focusedId ? ids.indexOf(focusedId) : ids.length - 1;
      const nextIdx = Math.max(0, Math.min(ids.length - 1, idx + direction));
      const nextId = ids[nextIdx];
      if (nextId) {
        setHoveredId(nextId);
        setActiveId(null);
        scrollToSnapshot(nextId);
      }
    },
    [primaryBranch, activeId, hoveredId, currentSnapshotId, scrollToSnapshot]
  );

  // Drag-to-scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    scrollRef.current.focus({ preventScroll: true });
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
    };
    scrollRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  }, []);

  const handleNodeClick = (snapshotId: string) => {
    setActiveId((prev) => (prev === snapshotId ? null : snapshotId));
  };

  return (
    <div
      className="campaign-timeline absolute bottom-0 left-0 w-full z-30 select-none font-mono text-xs"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Collapse toggle tab */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-b-0 border-slate-700 rounded-t-md px-4 py-1 text-slate-400 hover:text-amber-400 transition-colors backdrop-blur-md text-[10px] uppercase tracking-widest"
      >
        {collapsed ? 'Show Timeline' : 'Hide Timeline'}
      </button>

      {/* Main bar */}
      <div
        className={`bg-slate-950/90 border-t border-slate-700 backdrop-blur-md transition-all duration-300 ease-in-out ${
          collapsed ? 'border-t-0 pointer-events-none opacity-0' : ''
        }`}
        style={{ height: collapsed ? 0 : panelHeight }}
      >
        {snapshots.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-slate-600 italic">
            No timeline snapshots yet. Play a few turns to begin recording history.
          </div>
        ) : (
          <section
            ref={scrollRef}
            tabIndex={-1}
            className="overflow-auto cursor-grab outline-none relative top-14"
            style={{ height: panelHeight - 56 }}
            aria-label="History timeline — use left/right arrows to step through turns"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepThroughPrimary(1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepThroughPrimary(-1);
              } else if (e.key === 'Home') {
                e.preventDefault();
                const first = primaryBranch?.nodeIds[0];
                if (first) {
                  setHoveredId(first);
                  scrollToSnapshot(first);
                }
              } else if (e.key === 'End') {
                e.preventDefault();
                if (currentSnapshotId) {
                  setHoveredId(currentSnapshotId);
                  scrollToSnapshot(currentSnapshotId);
                }
              }
            }}
          >
            {/* SVG track layer for lines and branch connectors */}
            <div className="relative" style={{ width: totalWidth, height: graphHeight }}>
              <svg
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                width={totalWidth}
                height={graphHeight}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Branch lines */}
                {branches.map((branch, bIdx) => {
                  const nodePositions = branch.nodeIds
                    .map((nid) => layout.get(nid))
                    .filter(Boolean) as { x: number; y: number }[];

                  if (nodePositions.length < 2 && !branch.parentNodeId) return null;

                  const segments: React.ReactNode[] = [];

                  // Fork connector from parent
                  if (branch.parentNodeId && layout.has(branch.parentNodeId)) {
                    const parentPos = layout.get(branch.parentNodeId)!;
                    const firstPos = nodePositions[0];
                    if (firstPos) {
                      segments.push(
                        <path
                          key={`fork-${branch.branchId}`}
                          d={`M ${parentPos.x} ${parentPos.y} C ${parentPos.x + 40} ${parentPos.y}, ${firstPos.x - 40} ${firstPos.y}, ${firstPos.x} ${firstPos.y}`}
                          stroke="#94a3b8"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          fill="none"
                          opacity={0.5}
                        />
                      );
                    }
                  }

                  // Main line through branch nodes
                  for (let i = 0; i < nodePositions.length - 1; i++) {
                    const a = nodePositions[i];
                    const b = nodePositions[i + 1];
                    segments.push(
                      <line
                        key={`seg-${branch.branchId}-${branch.nodeIds[i]}-${branch.nodeIds[i + 1]}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="#d97706"
                        strokeWidth={2}
                        opacity={bIdx === 0 ? 0.8 : 0.4}
                      />
                    );
                  }

                  return <g key={branch.branchId}>{segments}</g>;
                })}
              </svg>

              {/* Snapshot nodes */}
              {snapshots.map((snap) => {
                const pos = layout.get(snap.id);
                if (!pos) return null;

                const isCurrent = snap.id === currentSnapshotId;
                const category = classifySnapshot(snap);
                const colors = NODE_COLORS[category];
                const r = isCurrent ? CURRENT_RADIUS : NODE_RADIUS;

                return (
                  <div
                    key={snap.id}
                    className="absolute"
                    style={{
                      left: pos.x - 22,
                      top: pos.y - 22,
                      width: 44,
                      height: 44,
                    }}
                  >
                    {/* The clickable node */}
                    <button
                      type="button"
                      className="group w-full h-full flex items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-amber-400"
                      onMouseEnter={() => setHoveredId(snap.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeClick(snap.id);
                      }}
                      aria-label={`Turn ${snap.turnYear}: ${snap.description}`}
                    >
                      <span
                        aria-hidden="true"
                        style={{ width: r * 2, height: r * 2 }}
                        className={`rounded-full border-2 transition-transform duration-200 ${colors.fill} ${
                          isCurrent
                            ? `border-amber-300 shadow-[0_0_12px_3px] ${colors.glow}`
                            : 'border-slate-600 group-hover:border-slate-400 group-hover:scale-125'
                        }`}
                      />
                    </button>

                    {/* Year label below node */}
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-0.5 whitespace-nowrap text-[11px] ${
                        isCurrent ? 'text-amber-400 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {snap.turnYear}
                    </div>

                    {/* Description label further below */}
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 whitespace-nowrap text-[10px] max-w-[112px] truncate text-center ${colors.badge}`}
                    >
                      {truncate(snap.description, 22)}
                    </div>

                    {/* Tooltips are rendered as a portal below to escape overflow */}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Controls + current year indicator in top-right of timeline bar */}
        <div className="absolute top-2 right-3 flex items-center gap-2 sm:gap-3">
          {snapshots.length > 0 && (
            <>
              <div className="flex items-center gap-0.5 bg-slate-900/80 border border-slate-700 rounded">
                <button
                  type="button"
                  onClick={() => stepThroughPrimary(-1)}
                  className="px-1.5 py-0.5 text-slate-400 hover:text-amber-400 text-[11px] leading-none disabled:opacity-30"
                  title="Previous turn (←)"
                  aria-label="Previous turn"
                  disabled={!primaryBranch || primaryBranch.nodeIds.length <= 1}
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => stepThroughPrimary(1)}
                  className="px-1.5 py-0.5 text-slate-400 hover:text-amber-400 text-[11px] leading-none border-l border-slate-700 disabled:opacity-30"
                  title="Next turn (→)"
                  aria-label="Next turn"
                  disabled={!primaryBranch || primaryBranch.nodeIds.length <= 1}
                >
                  ▶
                </button>
              </div>
              <div className="flex items-center gap-0.5 bg-slate-900/80 border border-slate-700 rounded">
                <button
                  type="button"
                  onClick={() =>
                    setZoom((z) =>
                      z === 'wide' ? 'normal' : z === 'normal' ? 'compact' : 'compact'
                    )
                  }
                  className="px-1.5 py-0.5 text-slate-400 hover:text-amber-400 text-[11px] leading-none disabled:opacity-30"
                  title="Zoom out"
                  aria-label="Zoom timeline out"
                  disabled={zoom === 'compact'}
                >
                  −
                </button>
                <span className="px-1 text-[9px] text-slate-500 border-l border-r border-slate-700 uppercase tracking-wider">
                  {zoom}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setZoom((z) => (z === 'compact' ? 'normal' : z === 'normal' ? 'wide' : 'wide'))
                  }
                  className="px-1.5 py-0.5 text-slate-400 hover:text-amber-400 text-[11px] leading-none disabled:opacity-30"
                  title="Zoom in"
                  aria-label="Zoom timeline in"
                  disabled={zoom === 'wide'}
                >
                  +
                </button>
              </div>
              {currentSnapshotId && (
                <button
                  type="button"
                  onClick={() => scrollToSnapshot(currentSnapshotId)}
                  className="px-2 py-0.5 bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-amber-400 text-[10px] leading-none rounded uppercase tracking-wider"
                  title="Jump to current turn"
                >
                  Now
                </button>
              )}
            </>
          )}
          <span className="text-slate-500 text-[10px] uppercase tracking-wider hidden sm:inline">
            Current
          </span>
          <span className="text-amber-400 font-bold text-sm">{currentYear}</span>
        </div>
      </div>

      {/* Fixed-position tooltips (escape overflow-hidden on parent main) */}
      {/* eslint-disable react-hooks/refs */}
      {(() => {
        const targetId = activeId || hoveredId;
        const snap = targetId ? snapshots.find((s) => s.id === targetId) : null;
        const pos = targetId ? layout.get(targetId) : null;
        const scrollEl = scrollRef.current;
        if (!snap || !pos || !scrollEl) return null;

        const rect = scrollEl.getBoundingClientRect();
        const screenX = rect.left + pos.x - scrollEl.scrollLeft;
        const screenY = rect.top + pos.y;
        const isCurrent = snap.id === currentSnapshotId;
        const category = classifySnapshot(snap);
        const colors = NODE_COLORS[category];
        const parentSnapshot = snap.parentSnapshotId
          ? snapshots.find((candidate) => candidate.id === snap.parentSnapshotId)
          : null;
        const diff = diffTimelineSnapshots(parentSnapshot, snap);
        const popoverWidth =
          typeof window !== 'undefined' && window.innerWidth < 640
            ? Math.min(320, window.innerWidth - 16)
            : 320;
        const tooltipWidth =
          typeof window !== 'undefined' && window.innerWidth < 640
            ? Math.min(224, window.innerWidth - 16)
            : 224;

        // Action popover (on click, non-current nodes)
        if (activeId === snap.id) {
          return createPortal(
            <div
              className="fixed bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl backdrop-blur-lg z-[60] max-h-[min(70vh,28rem)] overflow-y-auto animate-fade-in"
              style={{
                width: popoverWidth,
                left: clampHorizontal(screenX, popoverWidth),
                bottom: window.innerHeight - screenY + 12,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                    Turn Replay
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Year {snap.turnYear} · {formatTimestamp(snap.timestamp)}
                  </div>
                </div>
                <span className={`text-[9px] uppercase font-bold ${colors.badge}`}>{category}</span>
              </div>

              <div className="rounded border border-slate-700 bg-slate-950/60 p-2 mb-2">
                <div className="text-slate-500 text-[9px] uppercase mb-1">Command</div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  {truncate(snap.command, 180)}
                </div>
              </div>

              <div className="rounded border border-slate-700 bg-slate-950/60 p-2 mb-2">
                <div className="text-slate-500 text-[9px] uppercase mb-1">State diff</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {diff.summary.map((line) => (
                    <span
                      key={line}
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                    >
                      {line}
                    </span>
                  ))}
                </div>
                {diff.ownerChanges.slice(0, 4).map((change) => (
                  <div key={change.provinceId} className="text-[10px] text-slate-400 truncate">
                    Province {change.provinceId}: {change.from ?? 'none'} → {change.to ?? 'none'}
                  </div>
                ))}
                {diff.ownerChanges.length > 4 && (
                  <div className="text-[10px] text-slate-600">
                    +{diff.ownerChanges.length - 4} more province changes
                  </div>
                )}
                {diff.relationChanges.slice(0, 3).map((change) => (
                  <div key={change.label} className="text-[10px] text-slate-400 truncate">
                    {change.label}: {change.from ?? 'none'} → {change.to ?? 'none'}
                  </div>
                ))}
              </div>

              {diff.newEvents.length > 0 && (
                <div className="rounded border border-slate-700 bg-slate-950/60 p-2 mb-2 space-y-1">
                  <div className="text-slate-500 text-[9px] uppercase mb-1">New events</div>
                  {diff.newEvents.slice(0, 3).map((event) => (
                    <EventCard key={event.id} event={event} compact />
                  ))}
                  {diff.newEvents.length > 3 && (
                    <div className="text-[10px] text-slate-600 pt-0.5">
                      +{diff.newEvents.length - 3} more
                    </div>
                  )}
                </div>
              )}

              {!isTimelineMemory(snap.memory) && (
                <p className="text-amber-300 text-[11px] mb-2">
                  Older snapshot: historical memory was not saved. Replay inspection only.
                </p>
              )}
              {!isCurrent && isTimelineMemory(snap.memory) && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRewind(snap.id);
                      setActiveId(null);
                    }}
                    className="px-3 py-1.5 bg-amber-700/80 hover:bg-amber-600 text-white text-[11px] font-bold rounded transition-colors uppercase tracking-wide"
                  >
                    Rewind
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBranch(snap.id);
                      setActiveId(null);
                    }}
                    className="px-3 py-1.5 bg-sky-700/80 hover:bg-sky-600 text-white text-[11px] font-bold rounded transition-colors uppercase tracking-wide"
                  >
                    Branch
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveId(null);
                }}
                className="w-full mt-1.5 px-3 py-1 text-slate-500 hover:text-slate-300 text-[10px] text-center transition-colors"
              >
                Cancel
              </button>
            </div>,
            document.body
          );
        }

        // Hover tooltip
        if (hoveredId === snap.id && !activeId) {
          return createPortal(
            <div
              className="fixed bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl backdrop-blur-lg pointer-events-none z-[60] animate-fade-in"
              style={{
                width: tooltipWidth,
                left: clampHorizontal(screenX, tooltipWidth),
                bottom: window.innerHeight - screenY + 12,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-amber-400">Year {snap.turnYear}</span>
                <span className={`text-[9px] uppercase font-bold ${colors.badge}`}>{category}</span>
              </div>
              <div className="text-slate-300 text-[11px] mb-1.5 leading-relaxed">
                {snap.description}
              </div>
              <div className="text-slate-500 text-[10px] italic mb-1">
                &gt; {truncate(snap.command, 40)}
              </div>
              {snap.gameStateSlim.events.length > 0 && (
                <div className="border-t border-slate-700 pt-1.5 mt-1.5 space-y-1">
                  <div className="text-slate-500 text-[9px] uppercase mb-1">Events</div>
                  {snap.gameStateSlim.events.slice(0, 2).map((evt) => (
                    <EventCard key={evt.id} event={evt} compact />
                  ))}
                  {snap.gameStateSlim.events.length > 2 && (
                    <div className="text-slate-600 text-[9px]">
                      +{snap.gameStateSlim.events.length - 2} more
                    </div>
                  )}
                </div>
              )}
              <div className="text-slate-600 text-[9px] mt-1.5">
                {formatTimestamp(snap.timestamp)}
              </div>
            </div>,
            document.body
          );
        }

        return null;
      })()}
      {/* eslint-enable react-hooks/refs */}
    </div>
  );
}
