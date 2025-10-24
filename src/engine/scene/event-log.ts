// src/engine/scene/event-log.ts
import type { EventLogEntry, SceneState } from './types';

// In-memory store for idempotency tracking and event persistence
// In production, this would be backed by a database
const processedKeys = new Set<string>(); // idempotency keys
const log: EventLogEntry[] = [];
const snapshots = new Map<string, SceneState>();

export function hasProcessed(idempotencyKey: string): boolean {
  return processedKeys.has(idempotencyKey);
}

export function markProcessed(idempotencyKey: string): void {
  processedKeys.add(idempotencyKey);
}

export function append(entry: EventLogEntry): void {
  log.push(entry);
}

export function storeSnapshot(idempotencyKey: string, state: SceneState): void {
  snapshots.set(idempotencyKey, JSON.parse(JSON.stringify(state)));
}

export function getSnapshot(idempotencyKey: string): SceneState | undefined {
  const snapshot = snapshots.get(idempotencyKey);
  return snapshot ? JSON.parse(JSON.stringify(snapshot)) : undefined;
}

export function all(): EventLogEntry[] {
  return [...log];
}

export function forScene(sceneId: string): EventLogEntry[] {
  return log.filter(entry => entry.sceneId === sceneId);
}

export function clear(): void {
  processedKeys.clear();
  log.length = 0;
  snapshots.clear();
}

// Query functions
export function findByActionType<T>(
  sceneId: string,
  actionType: string
): EventLogEntry[] {
  return forScene(sceneId).filter(entry => 
    entry.action.type === actionType
  );
}

export function findForActor(
  sceneId: string,
  actorId: string
): EventLogEntry[] {
  return forScene(sceneId).filter(entry => 
    entry.actorId === actorId
  );
}

export function inTimeRange(
  sceneId: string,
  startTime: number,
  endTime: number
): EventLogEntry[] {
  return forScene(sceneId).filter(entry => 
    entry.at >= startTime && entry.at <= endTime
  );
}

// Pagination
export function paginate(
  sceneId: string,
  offset: number = 0,
  limit: number = 50
): { entries: EventLogEntry[]; total: number } {
  const entries = forScene(sceneId);
  return {
    entries: entries.slice(offset, offset + limit),
    total: entries.length
  };
}
