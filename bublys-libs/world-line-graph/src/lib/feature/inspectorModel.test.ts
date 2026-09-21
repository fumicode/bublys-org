/**
 * インスペクタが「参照はあるのに値が無い」を正しく言い当てることを固定する。
 * デバッグ道具が嘘をつくと、無いより悪い。
 */
import { WorldLineGraph } from '../domain/WorldLineGraph';
import { createStateRef } from '../domain/StateRef';
import { computeStateHash } from '../domain/StateHash';
import {
  TOMBSTONE_HASH,
  buildNodeRows,
  buildScopeRows,
  buildStateRows,
  locateRef,
  type InspectorSources,
} from './inspectorModel';

const src = (over: Partial<InspectorSources> = {}): InspectorSources => ({
  cas: {},
  idbHashes: new Set<string>(),
  fetched: {},
  ...over,
});

const hashOf = (v: unknown) => computeStateHash(v);

describe('locateRef — 値がどこにあるか', () => {
  it('メモリ（Redux の CAS）にあれば memory', () => {
    expect(locateRef('h1', src({ cas: { h1: { a: 1 } } }))).toBe('memory');
  });

  it('メモリに無く IndexedDB にあれば idb（＝追い出されただけ）', () => {
    expect(locateRef('h1', src({ idbHashes: new Set(['h1']) }))).toBe('idb');
  });

  it('どちらにも無ければ lost（もう復元できない）', () => {
    expect(locateRef('h1', src())).toBe('lost');
  });

  it('IndexedDB をまだ読めていないうちは lost と言い切らない', () => {
    // 読み込み中の一瞬を「消失」と出すのが、いちばん困る誤報になる
    expect(locateRef('h1', src({ idbHashes: null }))).toBe('idb');
  });

  it('削除マーカーは tombstone（「値が無い」ではなく「消された」）', () => {
    expect(locateRef(TOMBSTONE_HASH, src())).toBe('tombstone');
  });

  it('メモリに null（tombstone の実体）があっても memory と混同しない', () => {
    expect(locateRef(TOMBSTONE_HASH, src({ cas: { [TOMBSTONE_HASH]: null } }))).toBe(
      'tombstone'
    );
  });
});

describe('buildScopeRows — スコープ一覧', () => {
  it('メモリと IndexedDB の和を出す（片方にしか無いスコープを見落とさない）', () => {
    const graphs = { 'A:1': WorldLineGraph.empty().grow([]).toJSON() };
    const rows = buildScopeRows(graphs, ['B:2']);
    expect(rows.map((r) => r.scopeId)).toEqual(['A:1', 'B:2']);
    expect(rows[0]).toMatchObject({ inMemory: true, inIdb: false });
    expect(rows[1]).toMatchObject({ inMemory: false, inIdb: true, nodeCount: 0 });
  });

  it('いまの世界に載っている型ごとの件数を出す', () => {
    const graph = WorldLineGraph.empty().grow([
      createStateRef('Staff', 's1', hashOf({ id: 's1' })),
      createStateRef('Staff', 's2', hashOf({ id: 's2' })),
      createStateRef('Schedule', 'x', hashOf({ id: 'x' })),
    ]);
    const [row] = buildScopeRows({ 'Schedule:x': graph.toJSON() }, []);
    expect(row.typeCounts).toEqual([
      { type: 'Schedule', count: 1 },
      { type: 'Staff', count: 2 },
    ]);
  });

  it('削除済み（tombstone）は「載っている」に数えない', () => {
    const graph = WorldLineGraph.empty()
      .grow([createStateRef('Staff', 's1', hashOf({ id: 's1' }))])
      .grow([createStateRef('Staff', 's1', TOMBSTONE_HASH)]);
    const [row] = buildScopeRows({ 'Schedule:x': graph.toJSON() }, []);
    expect(row.typeCounts).toEqual([]);
  });
});

describe('buildNodeRows / buildStateRows', () => {
  const staff = createStateRef('Staff', 's1', hashOf({ id: 's1', name: '田中' }));
  const sched0 = createStateRef('Schedule', 'x', hashOf({ id: 'x', n: 0 }));
  const sched1 = createStateRef('Schedule', 'x', hashOf({ id: 'x', n: 1 }));

  const graph = WorldLineGraph.empty()
    .grow([staff, sched0]) // 起点：固定メンバー＋持ち主
    .grow([sched1]); // 編集：勤務表だけ変わった

  it('ノード行は差分だけを持ち、root と apex が分かる', () => {
    const rows = buildNodeRows(graph, src({ cas: {} }));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ isRoot: true, isApex: false, depth: 0 });
    expect(rows[0].changed.map((c) => `${c.type}:${c.id}`).sort()).toEqual([
      'Schedule:x',
      'Staff:s1',
    ]);
    // 2つめのノードは勤務表しか変えていない（固定メンバーは載らない＝差分だから）
    expect(rows[1]).toMatchObject({ isRoot: false, isApex: true, depth: 1 });
    expect(rows[1].changed.map((c) => c.type)).toEqual(['Schedule']);
  });

  it('全体状態は畳み込み結果。差分に出てこない固定メンバーもちゃんと出る', () => {
    const apex = graph.state.apexNodeId as string;
    const rows = buildStateRows(graph, apex, src());
    expect(rows.map((r) => `${r.type}:${r.id}`)).toEqual(['Schedule:x', 'Staff:s1']);
    // 勤務表は編集後の版になっている（後勝ち）
    expect(rows.find((r) => r.type === 'Schedule')?.hash).toBe(sched1.hash);
  });

  it('起点へ戻ると、勤務表は編集前の版に戻り、固定メンバーは変わらない', () => {
    const root = graph.state.rootNodeId as string;
    const rows = buildStateRows(graph, root, src());
    expect(rows.find((r) => r.type === 'Schedule')?.hash).toBe(sched0.hash);
    expect(rows.find((r) => r.type === 'Staff')?.hash).toBe(staff.hash);
  });

  it('メモリにある値はプレビューが出る。無ければ出ない（引くボタンになる）', () => {
    const apex = graph.state.apexNodeId as string;
    const rows = buildStateRows(
      graph,
      apex,
      src({ cas: { [staff.hash]: { id: 's1', name: '田中' } } })
    );
    expect(rows.find((r) => r.type === 'Staff')?.preview).toContain('田中');
    expect(rows.find((r) => r.type === 'Schedule')?.preview).toBeUndefined();
  });
});
