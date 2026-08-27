/**
 * Dirección visual: bitácora cronológica de misión, con eventos discretos y
 * recompensas trazables. Toda entrada se añade de forma inmutable e idempotente.
 */
import type { DiscoveryEntry, DiscoveryKind, DiscoveryRarity, TycoonState } from "./TycoonState";

export type DiscoveryDraft = Omit<DiscoveryEntry, "id" | "cycle" | "occurredAt"> & { id: string; cycle?: number; occurredAt?: number };
export type DiscoveryFilter = "all" | DiscoveryKind;
export type DiscoveryRarityFilter = "all" | DiscoveryRarity;
export type DiscoverySort = "cycle-desc" | "cycle-asc" | "rarity-desc";

const HISTORY_LIMIT = 80;

export function rarityForDiscovery(entry: Pick<DiscoveryEntry, "kind" | "reward" | "rarity">): DiscoveryRarity {
  if (entry.rarity) return entry.rarity;
  if (entry.kind === "foundation" || entry.kind === "reward") return "landmark";
  if (entry.kind === "sector" || entry.kind === "milestone") return "rare";
  if (entry.kind === "research" || Boolean(entry.reward)) return "notable";
  return "signal";
}

export function recordDiscovery(state: TycoonState, draft: DiscoveryDraft): TycoonState {
  if (state.discoveries.some((entry) => entry.id === draft.id)) return state;
  const entry: DiscoveryEntry = { ...draft, cycle: draft.cycle ?? state.cycle, occurredAt: draft.occurredAt ?? Date.now(), rarity: rarityForDiscovery(draft) };
  return { ...state, discoveries: [...state.discoveries, entry].slice(-HISTORY_LIMIT) };
}

export function recordDiscoveries(state: TycoonState, drafts: DiscoveryDraft[]): TycoonState { return drafts.reduce(recordDiscovery, state); }

const rarityRank: Record<DiscoveryRarity, number> = { signal: 1, notable: 2, rare: 3, landmark: 4 };

export function visibleDiscoveries(state: TycoonState, filter: DiscoveryFilter, rarity: DiscoveryRarityFilter = "all", sort: DiscoverySort = "cycle-desc") {
  const entries = state.discoveries.filter((entry) => (filter === "all" || entry.kind === filter) && (rarity === "all" || rarityForDiscovery(entry) === rarity));
  return [...entries].sort((a, b) => {
    if (sort === "rarity-desc") return rarityRank[rarityForDiscovery(b)] - rarityRank[rarityForDiscovery(a)] || b.cycle - a.cycle || b.occurredAt - a.occurredAt || a.id.localeCompare(b.id);
    const direction = sort === "cycle-asc" ? 1 : -1;
    return direction * (a.cycle - b.cycle) || direction * (a.occurredAt - b.occurredAt) || a.id.localeCompare(b.id);
  });
}

export function discoverySummary(state: TycoonState) {
  const discoveredKinds = new Set(state.discoveries.map((entry) => entry.kind));
  return { total: state.discoveries.length, categories: discoveredKinds.size, rewards: state.discoveries.filter((entry) => entry.kind === "reward").length };
}
