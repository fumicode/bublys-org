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

/**
 * Redux 上に保持する CAS エントリ数の上限。
 *
 * 全ての世界の状態は IndexedDB（`IndexedDBStore.ts`）に永続化され続ける
 * （アカシックレコード）ため、Redux/ブラウザメモリ上は直近に追加された分
 * だけに絞ってよい。溢れた分は evict しても、必要になった時点で
 * `useCasScope` がオンデマンドで IndexedDB から再取得し復元する。
 */
export const MAX_CAS_ENTRIES = 300;

/**
 * `cas` のキー数が上限を超えていたら、古いものから削除する。
 *
 * 削除順はキーの「最初に挿入された順」（＝FIFO）であり、アクセス頻度は考慮しない
 * （オブジェクトのキー順は既存キーへの再代入では変わらないため、LRUではない）。
 * evict されても IndexedDB からオンデマンド復元されるため実害はないが、
 * hot なデータが evict→再取得を繰り返す可能性はある。将来 LRU 化するなら
 * 参照時にキーを入れ直す等が必要。
 *
 * 保護するのは次の2つ:
 *   - `protectHashes`（呼び出し側が「これから使う」と申告したもの）
 *   - **全スコープの現在ノードが参照しているハッシュ**
 *
 * 後者が要るのは、CAS がアプリ全体で1つの共有 Record だから。あるスコープの書き込みが、
 * 別スコープが今まさに見ている世界のデータを追い出してしまうと、そのスコープでは
 * 状態が読めなくなる（永続ストアからの復元が間に合わず「古いまま」に見える）。
 * 走査は溢れているときだけなので、通常の書き込みでは走らない。
 */
function currentWorldHashes(state: WorldLineSliceState): Set<string> {
  const hashes = new Set<string>();
  for (const graphJson of Object.values(state.graphs)) {
    const graph = WorldLineGraph.fromJSON(graphJson as WorldLineGraphJson);
    for (const ref of graph.getCurrentStateRefs()) hashes.add(ref.hash);
  }
  return hashes;
}

function evictCas(state: WorldLineSliceState, protectHashes: readonly string[]) {
  const keys = Object.keys(state.cas);
  const overflow = keys.length - MAX_CAS_ENTRIES;
  if (overflow <= 0) return;

  const protectedSet = currentWorldHashes(state);
  for (const hash of protectHashes) protectedSet.add(hash);
  let removed = 0;
  for (const key of keys) {
    if (removed >= overflow) break;
    if (protectedSet.has(key)) continue;
    delete state.cas[key];
    removed++;
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
        /** 削除対象から保護したいハッシュ（現在表示中の世界が参照しているデータなど） */
        protectHashes?: string[];
      }>
    ) {
      const { entries, protectHashes } = action.payload;
      for (const entry of entries) {
        state.cas[entry.hash] = entry.data;
      }
      evictCas(state, protectHashes ?? []);
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
