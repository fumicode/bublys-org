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
  graphs: Record<
    string,
    {
      graph: WorldLineGraphJson;
      loadedStates: Record<string, unknown>;
    }
  >;
}

const initialState: WorldLineSliceState = {
  graphs: {},
};

// ============================================================================
// Helper
// ============================================================================

function ensureScope(state: WorldLineSliceState, scopeId: string) {
  if (!state.graphs[scopeId]) {
    state.graphs[scopeId] = {
      graph: WorldLineGraph.empty().toJSON(),
      loadedStates: {},
    };
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
      state.graphs[scopeId].graph = graph;
    },

    setLoadedStates(
      state,
      action: PayloadAction<{
        scopeId: string;
        entries: { hash: string; data: unknown }[];
      }>
    ) {
      const { scopeId, entries } = action.payload;
      ensureScope(state, scopeId);
      for (const entry of entries) {
        state.graphs[scopeId].loadedStates[entry.hash] = entry.data;
      }
    },

    setLoadedState(
      state,
      action: PayloadAction<{ scopeId: string; hash: string; data: unknown }>
    ) {
      const { scopeId, hash, data } = action.payload;
      ensureScope(state, scopeId);
      state.graphs[scopeId].loadedStates[hash] = data;
    },
  },
});

export const {
  setGraph,
  setLoadedStates,
  setLoadedState,
} = worldLineGraphSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

export function selectWorldLineGraph(
  state: RootState,
  scopeId: string
): WorldLineGraph {
  const scope = state.worldLineGraph?.graphs[scopeId];
  if (!scope) return WorldLineGraph.empty();
  return WorldLineGraph.fromJSON(scope.graph);
}

export function selectLoadedStates(
  state: RootState,
  scopeId: string
): Record<string, unknown> {
  return state.worldLineGraph?.graphs[scopeId]?.loadedStates ?? {};
}

// ============================================================================
// Module augmentation for lazy loading
// ============================================================================

declare module '@bublys-org/state-management' {
  interface LazyLoadedSlices {
    worldLineGraph: WorldLineSliceState;
  }
}
