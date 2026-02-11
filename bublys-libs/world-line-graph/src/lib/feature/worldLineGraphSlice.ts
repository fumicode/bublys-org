import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  WorldLineGraph,
  type WorldLineGraphJson,
} from '../domain/WorldLineGraph';
import type { RootState } from '@bublys-org/state-management';

// ============================================================================
// State
// ============================================================================

export interface WorldLineSliceState {
  cas: Record<string, unknown>;               // 共有 CAS: hash → data
  graphs: Record<string, WorldLineGraphJson>;  // WLG DAG のみ
}

const initialState: WorldLineSliceState = {
  cas: {},
  graphs: {},
};

// ============================================================================
// Helper
// ============================================================================

function ensureScope(state: WorldLineSliceState, scopeId: string) {
  if (!state.graphs[scopeId]) {
    state.graphs[scopeId] = WorldLineGraph.empty().toJSON();
  }
}

// ============================================================================
// Slice — リポジトリ役: 受け取ったデータを保存するだけ
// ============================================================================

export const worldLineGraphSlice = createSlice({
  name: 'worldLineGraph',
  initialState,
  reducers: {
    setGraph(
      state,
      action: PayloadAction<{ scopeId: string; graph: WorldLineGraphJson }>
    ) {
      const { scopeId, graph } = action.payload;
      ensureScope(state, scopeId);
      state.graphs[scopeId] = graph;
    },

    setCasEntries(
      state,
      action: PayloadAction<{
        entries: { hash: string; data: unknown }[];
      }>
    ) {
      const { entries } = action.payload;
      for (const entry of entries) {
        state.cas[entry.hash] = entry.data;
      }
    },

    createScope(state, action: PayloadAction<string>) {
      ensureScope(state, action.payload);
    },

    deleteScope(state, action: PayloadAction<string>) {
      delete state.graphs[action.payload];
    },
  },
});

export const {
  setGraph,
  setCasEntries,
  createScope,
  deleteScope,
} = worldLineGraphSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

export function selectWorldLineGraph(
  state: RootState,
  scopeId: string
): WorldLineGraph {
  const graphJson = state.worldLineGraph?.graphs[scopeId];
  if (!graphJson) return WorldLineGraph.empty();
  return WorldLineGraph.fromJSON(graphJson);
}

export function selectCasData(
  state: RootState,
  hashes: string[]
): Record<string, unknown> {
  const cas = state.worldLineGraph?.cas;
  if (!cas) return {};
  const result: Record<string, unknown> = {};
  for (const hash of hashes) {
    if (cas[hash] !== undefined) {
      result[hash] = cas[hash];
    }
  }
  return result;
}

export function selectScopeIds(
  state: RootState,
  prefix: string
): string[] {
  const graphs = state.worldLineGraph?.graphs;
  if (!graphs) return [];
  return Object.keys(graphs)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}

// ============================================================================
// Module augmentation for lazy loading
// ============================================================================

declare module '@bublys-org/state-management' {
  interface LazyLoadedSlices {
    worldLineGraph: WorldLineSliceState;
  }
}
