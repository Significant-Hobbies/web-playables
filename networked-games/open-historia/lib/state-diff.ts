import type { DiplomaticRelation, GameEvent, TimelineSnapshot } from '@/lib/types';

export interface ProvinceOwnerChange {
  provinceId: string;
  from: string | null;
  to: string | null;
}

export interface RelationDiff {
  label: string;
  from: string | null;
  to: string | null;
}

export interface SnapshotDiff {
  ownerChanges: ProvinceOwnerChange[];
  newEvents: GameEvent[];
  relationChanges: RelationDiff[];
  summary: string[];
}

function relationKey(relation: DiplomaticRelation): string {
  return [relation.nationA, relation.nationB].sort().join('::');
}

function relationLabel(relation: DiplomaticRelation): string {
  return [relation.nationA, relation.nationB].sort().join(' <-> ');
}

export function diffTimelineSnapshots(
  before: TimelineSnapshot | null | undefined,
  after: TimelineSnapshot
): SnapshotDiff {
  const beforeOwners = before?.gameStateSlim.provinceOwners ?? {};
  const afterOwners = after.gameStateSlim.provinceOwners;
  const provinceIds = new Set([...Object.keys(beforeOwners), ...Object.keys(afterOwners)]);

  const ownerChanges: ProvinceOwnerChange[] = [];
  for (const provinceId of provinceIds) {
    const from = beforeOwners[provinceId] ?? null;
    const to = afterOwners[provinceId] ?? null;
    if (from !== to) {
      ownerChanges.push({ provinceId, from, to });
    }
  }

  const beforeEventIds = new Set((before?.gameStateSlim.events ?? []).map((event) => event.id));
  const newEvents = after.gameStateSlim.events.filter((event) => !beforeEventIds.has(event.id));

  const beforeRelations = new Map(
    (before?.gameStateSlim.relations ?? []).map((relation) => [relationKey(relation), relation])
  );
  const afterRelations = new Map(
    after.gameStateSlim.relations.map((relation) => [relationKey(relation), relation])
  );
  const relationKeys = new Set([...beforeRelations.keys(), ...afterRelations.keys()]);
  const relationChanges: RelationDiff[] = [];

  for (const key of relationKeys) {
    const from = beforeRelations.get(key);
    const to = afterRelations.get(key);
    if (from?.type === to?.type) continue;

    relationChanges.push({
      label: relationLabel(to ?? from!),
      from: from?.type ?? null,
      to: to?.type ?? null,
    });
  }

  const summary: string[] = [];
  if (ownerChanges.length > 0) {
    summary.push(
      `${ownerChanges.length} province owner change${ownerChanges.length === 1 ? '' : 's'}`
    );
  }
  if (newEvents.length > 0) {
    summary.push(`${newEvents.length} new event${newEvents.length === 1 ? '' : 's'}`);
  }
  if (relationChanges.length > 0) {
    summary.push(
      `${relationChanges.length} relation change${relationChanges.length === 1 ? '' : 's'}`
    );
  }
  if (summary.length === 0) {
    summary.push('No material state delta recorded');
  }

  return {
    ownerChanges,
    newEvents,
    relationChanges,
    summary,
  };
}
