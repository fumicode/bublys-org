import {
  worldLineGraphSlice,
  setCasEntries,
  setGraph,
  MAX_CAS_ENTRIES,
} from './worldLineGraphSlice';
import { WorldLineGraph } from '../domain/WorldLineGraph';
import { createStateRef } from '../domain';

describe('worldLineGraphSlice — CAS eviction (アカシックレコード)', () => {
  const initialState = worldLineGraphSlice.getInitialState();

  it('上限以内なら全エントリが保持される', () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      hash: `hash-${i}`,
      data: { value: i },
    }));
    const state = worldLineGraphSlice.reducer(
      initialState,
      setCasEntries({ entries })
    );
    expect(Object.keys(state.cas)).toHaveLength(5);
  });

  it('上限を超えたら挿入順で古いエントリから削除される', () => {
    let state = initialState;
    // MAX_CAS_ENTRIES を超える数のエントリを1件ずつ追加していく
    for (let i = 0; i < MAX_CAS_ENTRIES + 10; i++) {
      state = worldLineGraphSlice.reducer(
        state,
        setCasEntries({ entries: [{ hash: `hash-${i}`, data: { value: i } }] })
      );
    }

    const keys = Object.keys(state.cas);
    expect(keys).toHaveLength(MAX_CAS_ENTRIES);
    // 最初期に追加した分（hash-0 〜 hash-9）は evict されている
    expect(state.cas['hash-0']).toBeUndefined();
    expect(state.cas['hash-9']).toBeUndefined();
    // 直近に追加した分は残っている
    expect(state.cas[`hash-${MAX_CAS_ENTRIES + 9}`]).toEqual({ value: MAX_CAS_ENTRIES + 9 });
  });

  it('protectHashes に指定したハッシュは古くても evict されない', () => {
    let state = worldLineGraphSlice.reducer(
      initialState,
      setCasEntries({ entries: [{ hash: 'protected-hash', data: { value: 'keep-me' } }] })
    );

    for (let i = 0; i < MAX_CAS_ENTRIES + 10; i++) {
      state = worldLineGraphSlice.reducer(
        state,
        setCasEntries({
          entries: [{ hash: `hash-${i}`, data: { value: i } }],
          protectHashes: ['protected-hash'],
        })
      );
    }

    expect(state.cas['protected-hash']).toEqual({ value: 'keep-me' });
  });
});

describe('worldLineGraphSlice — 現在の世界は evict から守られる', () => {
  /** scopeId の世界線を1ノード伸ばし、その状態を cas に載せた state を返す */
  const withWorld = (
    state: ReturnType<typeof worldLineGraphSlice.getInitialState>,
    scopeId: string,
    hash: string
  ) => {
    const graph = WorldLineGraph.empty().grow([createStateRef('Memo', scopeId, hash)]);
    const withGraph = worldLineGraphSlice.reducer(
      state,
      setGraph({ scopeId, graph: graph.toJSON() })
    );
    return worldLineGraphSlice.reducer(
      withGraph,
      setCasEntries({ entries: [{ hash, data: { scopeId } }] })
    );
  };

  it('別スコープの書き込みでも、いま見ている世界のデータは追い出されない', () => {
    // CAS はアプリ全体で1つの共有 Record なので、あるスコープの書き込みが
    // 別スコープの「今の世界」を追い出しうる。追い出されると、そのスコープでは
    // 状態が読めなくなる（時間移動しても古いまま、に見える）。
    let state = withWorld(worldLineGraphSlice.getInitialState(), 'scope-a', 'a-current');

    // 別スコープが大量に書き込んで上限を突破させる
    for (let i = 0; i < MAX_CAS_ENTRIES + 10; i++) {
      state = worldLineGraphSlice.reducer(
        state,
        setCasEntries({ entries: [{ hash: `noise-${i}`, data: { value: i } }] })
      );
    }

    expect(state.cas['a-current']).toEqual({ scopeId: 'scope-a' });
  });

  it('どのスコープからも参照されていないデータは追い出される', () => {
    let state = worldLineGraphSlice.reducer(
      worldLineGraphSlice.getInitialState(),
      setCasEntries({ entries: [{ hash: 'orphan', data: { value: 'x' } }] })
    );
    for (let i = 0; i < MAX_CAS_ENTRIES + 10; i++) {
      state = worldLineGraphSlice.reducer(
        state,
        setCasEntries({ entries: [{ hash: `noise-${i}`, data: { value: i } }] })
      );
    }

    expect(state.cas['orphan']).toBeUndefined();
    expect(Object.keys(state.cas)).toHaveLength(MAX_CAS_ENTRIES);
  });
});

describe('worldLineGraphSlice — scope間の参照安定性（cas購読の絞り込みの前提）', () => {
  it('あるscopeへのsetGraphは、他scopeのgraphs参照を変えない（Immerの構造共有）', () => {
    const seeded = worldLineGraphSlice.reducer(
      worldLineGraphSlice.getInitialState(),
      setGraph({ scopeId: 'scope-a', graph: WorldLineGraph.empty().toJSON() })
    );
    const otherGraphBefore = seeded.graphs['scope-a'];

    const updated = worldLineGraphSlice.reducer(
      seeded,
      setGraph({ scopeId: 'scope-b', graph: WorldLineGraph.empty().toJSON() })
    );

    // scope-b への setGraph では scope-a の graphs エントリの参照は変わらない。
    // useCasScope はこの性質に依存して、無関係な scope の更新で
    // 自身の graph/cas を作り直さないようにしている。
    expect(updated.graphs['scope-a']).toBe(otherGraphBefore);
  });
});
