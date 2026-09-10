/**
 * 3Dレイアウトの土台（席割り・全体状態の畳み込み・レーン・入れ子の導出）を固定する。
 *
 * とくに「変わったものを強調する」の定義。grow は渡された参照をそのまま焼くので、
 * changedRefs に入っている＝値が変わった、ではない。ここを取り違えると図が嘘をつく。
 */
import { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import { createStateRef, type StateRef } from '../../domain/StateRef.js';
import { computeStateHash } from '../../domain/StateHash.js';
import { buildSlotMap } from './slots.js';
import { foldCellStates } from './cellStates.js';
import { assignLanes } from './lanes.js';
import { deriveScopeTree, defaultNestedScopeResolver } from './scopeTree.js';

const h = (v: unknown) => computeStateHash(v);
const ref = (type: string, id: string, v: unknown) => createStateRef(type, id, h(v));

describe('buildSlotMap — 席は動かない', () => {
  const typed = [
    { type: 'Staff', key: 'Staff:s1' },
    { type: 'Staff', key: 'Staff:s2' },
    { type: 'Schedule', key: 'Schedule:x' },
  ];

  it('同じ key はいつでも同じ席', () => {
    const a = buildSlotMap(typed, 8);
    const b = buildSlotMap(typed, 8);
    for (const { key } of typed) expect(a.of(key)).toEqual(b.of(key));
  });

  it('あとから key が増えても、既にある席は動かない', () => {
    const before = buildSlotMap(typed, 8);
    const after = buildSlotMap([...typed, { type: 'Staff', key: 'Staff:s3' }], 8);
    // Staff の行に s3 が足されるだけ。Staff:s1/s2 の席は不変
    expect(after.of('Staff:s1')).toEqual(before.of('Staff:s1'));
    expect(after.of('Staff:s2')).toEqual(before.of('Staff:s2'));
  });

  it('型が変わると行を折り返す（型のかたまりが読める）', () => {
    const m = buildSlotMap(typed, 8);
    expect(m.of('Staff:s1')).toEqual({ col: 0, row: 0 });
    expect(m.of('Staff:s2')).toEqual({ col: 1, row: 0 });
    expect(m.of('Schedule:x')).toEqual({ col: 0, row: 1 });
  });

  it('歯抜けの席は逆引きで undefined になる（式で引くとずれる）', () => {
    const m = buildSlotMap(typed, 8);
    expect(m.at(0, 0)).toBe('Staff:s1');
    expect(m.at(1, 1)).toBeUndefined(); // Schedule の行の2席目は空
  });

  it('列数を超えたら折り返す', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      type: 'Staff',
      key: `Staff:s${i}`,
    }));
    const m = buildSlotMap(many, 2);
    expect(m.of('Staff:s0')).toEqual({ col: 0, row: 0 });
    expect(m.of('Staff:s2')).toEqual({ col: 0, row: 1 });
    expect(m.of('Staff:s4')).toEqual({ col: 0, row: 2 });
  });
});

describe('foldCellStates — 全体状態と「変わった」の定義', () => {
  const staff = ref('Staff', 's1', { name: '田中' });
  const sched0 = ref('Schedule', 'x', { n: 0 });
  const sched1 = ref('Schedule', 'x', { n: 1 });

  it('全体状態は畳み込み。差分に出てこない固定メンバーも居続ける', () => {
    const g = WorldLineGraph.empty().grow([staff, sched0]).grow([sched1]);
    const { statesByNode } = foldCellStates(g);
    const apex = g.state.apexNodeId as string;
    const keys = (statesByNode.get(apex) ?? []).map((c) => c.key).sort();
    expect(keys).toEqual(['Schedule:x', 'Staff:s1']);
    expect(statesByNode.get(apex)?.find((c) => c.key === 'Schedule:x')?.ref.hash).toBe(
      sched1.hash
    );
  });

  it('★ changedRefs に入っていても、値が変わっていなければ changed にしない', () => {
    // 「制約だけ変えた」等、勤務表は動かないのに参照だけ載る操作が実在する
    // （commit.test.ts「編集で値が変わらない型は、起点と次のノードで同じ参照のまま」）
    const g = WorldLineGraph.empty()
      .grow([staff, sched0])
      .grow([sched0, ref('Log', 'l1', { a: 1 })]); // Schedule は同じ値のまま載せる
    const apex = g.state.apexNodeId as string;
    const { statesByNode, unprunedChangedCount } = foldCellStates(g);
    const cells = statesByNode.get(apex) ?? [];
    const sched = cells.find((c) => c.key === 'Schedule:x');
    expect(sched?.inChangedRefs).toBe(true); // 参照としては載っている
    expect(sched?.changed).toBe(false); // でも値は変わっていない
    expect(cells.find((c) => c.key === 'Log:l1')?.changed).toBe(true);
    expect(unprunedChangedCount).toBe(1);
  });

  it('起点のセルはすべて changed（比べる前が無い）', () => {
    const g = WorldLineGraph.empty().grow([staff, sched0]);
    const root = g.state.rootNodeId as string;
    const cells = foldCellStates(g).statesByNode.get(root) ?? [];
    expect(cells.every((c) => c.changed)).toBe(true);
  });

  it('分岐しても、枝ごとに正しい全体状態になる', () => {
    let g = WorldLineGraph.empty().grow([staff, sched0]);
    const root = g.state.rootNodeId as string;
    g = g.grow([sched1]);
    const branchA = g.state.apexNodeId as string;
    const sched2 = ref('Schedule', 'x', { n: 2 });
    g = g.moveTo(root).grow([sched2]);
    const branchB = g.state.apexNodeId as string;

    const { statesByNode } = foldCellStates(g);
    const hashAt = (n: string) =>
      statesByNode.get(n)?.find((c) => c.key === 'Schedule:x')?.ref.hash;
    expect(hashAt(branchA)).toBe(sched1.hash);
    expect(hashAt(branchB)).toBe(sched2.hash);
    expect(hashAt(root)).toBe(sched0.hash);
  });

  it('正常なグラフでは getStateRefMapAt と完全に一致する（速い実装が嘘をつかない保証）', () => {
    let g = WorldLineGraph.empty().grow([staff, sched0]);
    const root = g.state.rootNodeId as string;
    g = g.grow([sched1]).grow([ref('Log', 'l1', { a: 1 })]);
    g = g.moveTo(root).grow([ref('Schedule', 'x', { n: 9 })]);

    const { statesByNode } = foldCellStates(g);
    for (const nodeId of Object.keys(g.state.nodes)) {
      const mine = new Map(
        (statesByNode.get(nodeId) ?? []).map((c) => [c.key, c.ref.hash])
      );
      const theirs = new Map(
        [...g.getStateRefMapAt(nodeId).entries()].map(([k, r]) => [k, r.hash])
      );
      expect(mine).toEqual(theirs);
    }
  });

  it('空グラフでも throw しない', () => {
    const r = foldCellStates(WorldLineGraph.empty());
    expect(r.statesByNode.size).toBe(0);
    expect(r.orphanNodeIds).toEqual([]);
  });

  it('親を辿れないノードは orphan に落ちる（throw しない）', () => {
    const g = WorldLineGraph.empty().grow([staff]);
    const json = g.toJSON();
    const broken = WorldLineGraph.fromJSON({
      ...json,
      nodes: {
        ...json.nodes,
        ghost: {
          id: 'ghost',
          parentId: 'no-such-node',
          timestamp: 1,
          changedRefs: [],
          worldLineId: 'w',
        },
      },
    });
    const r = foldCellStates(broken);
    expect(r.orphanNodeIds).toEqual(['ghost']);
  });
});

describe('assignLanes — 本線はまっすぐ、枝が逸れる', () => {
  it('同じ worldLineId の連続ノードは同じレーン', () => {
    const g = WorldLineGraph.empty()
      .grow([ref('A', 'a', 1)])
      .grow([ref('A', 'a', 2)])
      .grow([ref('A', 'a', 3)]);
    const { of } = assignLanes(g);
    const lanes = new Set(Object.keys(g.state.nodes).map((n) => of.get(n)));
    expect(lanes).toEqual(new Set([0]));
  });

  it('枝は別レーンに払い出される', () => {
    let g = WorldLineGraph.empty().grow([ref('A', 'a', 1)]);
    const root = g.state.rootNodeId as string;
    g = g.grow([ref('A', 'a', 2)]);
    const main = g.state.apexNodeId as string;
    g = g.moveTo(root).grow([ref('A', 'a', 3)]);
    const branch = g.state.apexNodeId as string;
    const { of } = assignLanes(g);
    expect(of.get(root)).toBe(0);
    expect(of.get(main)).toBe(0);
    expect(of.get(branch)).not.toBe(0);
  });

  it('nodes のキー順が変わっても結果は同じ（決定的）', () => {
    let g = WorldLineGraph.empty().grow([ref('A', 'a', 1)]);
    const root = g.state.rootNodeId as string;
    g = g.grow([ref('A', 'a', 2)]).moveTo(root).grow([ref('A', 'a', 3)]);
    const json = g.toJSON();
    const reversed = WorldLineGraph.fromJSON({
      ...json,
      nodes: Object.fromEntries(Object.entries(json.nodes).reverse()),
    });
    expect([...assignLanes(g).of.entries()].sort()).toEqual(
      [...assignLanes(reversed).of.entries()].sort()
    );
  });
});

describe('deriveScopeTree — 入れ子の導出', () => {
  const mkInput = (over: Partial<Parameters<typeof deriveScopeTree>[0]> = {}) => {
    const scopeRefs: Record<string, { nodeId: string; ref: StateRef }[]> = {
      hotel: [
        { nodeId: 'n1', ref: ref('Schedule', 'x', 1) },
        { nodeId: 'n1', ref: ref('Staff', 's1', 1) },
      ],
      'Schedule:x': [
        // 自分自身が載っている（saveObject が自スコープにもコミットするため実在する）
        { nodeId: 'm1', ref: ref('Schedule', 'x', 1) },
        { nodeId: 'm1', ref: ref('Staff', 's1', 1) },
      ],
    };
    const counts: Record<string, number> = { hotel: 1, 'Schedule:x': 1, 'Empty:z': 0 };
    const all = ['hotel', 'Schedule:x', 'Empty:z', 'Unreached:q'];
    return {
      rootScopeId: 'hotel',
      nodeCountOf: (s: string) => counts[s] ?? 0,
      refsOf: (s: string) => scopeRefs[s] ?? [],
      allScopeIds: all,
      resolve: defaultNestedScopeResolver((s) => (counts[s] ?? 0) >= 0 && s in counts),
      maxDepth: 4,
      ...over,
    };
  };

  it('オブジェクトが自分の世界線を持つなら入れ子になる', () => {
    const t = deriveScopeTree(mkInput());
    expect(t.scopes.map((s) => s.scopeId)).toEqual(['hotel', 'Schedule:x']);
    expect(t.scopes[1]).toMatchObject({
      level: 1,
      parentScopeId: 'hotel',
      kind: 'nominal',
      anchor: { nodeId: 'n1', key: 'Schedule:x' },
    });
  });

  it('★ 自己入れ子にしない（Schedule:x の中の Schedule:x）', () => {
    const t = deriveScopeTree(mkInput());
    // Schedule:x が自分自身をもう一段抱えていたら無限に潜る
    expect(t.scopes.filter((s) => s.scopeId === 'Schedule:x')).toHaveLength(1);
  });

  it('ノードが空のスコープは入れ子にしない', () => {
    const t = deriveScopeTree(mkInput());
    expect(t.scopes.map((s) => s.scopeId)).not.toContain('Empty:z');
    expect(t.emptyScopeIds).toContain('Empty:z');
  });

  it('図に出なかったスコープは黙って消さず orphan として申告する', () => {
    const t = deriveScopeTree(mkInput());
    expect(t.orphanScopeIds).toContain('Unreached:q');
  });

  it('maxDepth で必ず止まる', () => {
    const t = deriveScopeTree(mkInput({ maxDepth: 0 }));
    expect(t.scopes.map((s) => s.scopeId)).toEqual(['hotel']);
  });

  it('アドレス連動しているものは kind: linked になる（描き分けのため）', () => {
    const t = deriveScopeTree(mkInput({ isLinked: () => true }));
    expect(t.scopes[1].kind).toBe('linked');
  });
});
