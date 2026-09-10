/**
 * 3Dレイアウトの不変条件を固定する。
 *
 * ここが崩れると図が嘘をつく。とくに:
 *  - 板が重ならない（重なると「どっちのノードを見ているか」が分からない）
 *  - 同じ席は動かない（動くと「何が変わったか」が読めない）
 *  - 決定的（見るたびに配置が変わったら比べられない）
 *  - 入れ子が親セルの位置から始まる（「その場から奥へ」の担保）
 */
import { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import { createStateRef } from '../../domain/StateRef.js';
import { computeStateHash } from '../../domain/StateHash.js';
import { computeWorldLine3DLayout, cellOffset } from './layout3d.js';
import { DEFAULT_LAYOUT_3D_OPTIONS } from './types.js';

const h = (v: unknown) => computeStateHash(v);
const ref = (type: string, id: string, v: unknown) => createStateRef(type, id, h(v));

/** hotel と同じ形: アプリ全体スコープの中に、自分の世界線を持つ勤務表が居る */
function hotelLike() {
  const staff = [1, 2, 3].map((i) => ref('Staff', `s${i}`, { n: i }));
  const hotel = WorldLineGraph.empty()
    .grow([...staff, ref('Schedule', 'x', { n: 0 })])
    .grow([ref('Staff', 's1', { n: 11 })]);
  // 勤務表の世界線（固定メンバーが起点に載っている＝今回入れた仕組みと同じ形）
  let sched = WorldLineGraph.empty().grow([
    ...staff,
    ref('Schedule', 'x', { n: 0 }),
  ]);
  const schedRoot = sched.state.rootNodeId as string;
  sched = sched.grow([ref('Schedule', 'x', { n: 1 })]);
  sched = sched.moveTo(schedRoot).grow([ref('Schedule', 'x', { n: 2 })]); // 分岐
  return { graphs: { hotel, 'Schedule:x': sched }, schedRoot };
}

describe('computeWorldLine3DLayout', () => {
  it('板が1枚も重ならない（総当たりで確認）', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    expect(layout.diagnostics.violations).toEqual([]);
  });

  it('時間は +X。親より子が必ず先へ進む', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    for (const e of layout.edges) {
      expect(e.to[0]).toBeGreaterThan(e.from[0]);
    }
  });

  it('入れ子も同じ +X 方向へ流れる（直交させない）', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    const nested = layout.edges.filter((e) => e.scopeId === 'Schedule:x');
    expect(nested.length).toBeGreaterThan(0);
    for (const e of nested) {
      expect(e.to[0]).toBeGreaterThan(e.from[0]); // X が時間
      expect(e.to[2]).toBe(e.from[2]); // 段の中では Z は動かない
    }
  });

  it('入れ子は -Z の「段」に乗る。段の間隔は一定', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    const zOf = (scopeId: string) =>
      new Set(layout.plates.filter((p) => p.scopeId === scopeId).map((p) => p.origin[2]));
    expect([...zOf('hotel')]).toEqual([0]);
    const childZ = [...zOf('Schedule:x')];
    expect(childZ).toHaveLength(1);
    expect(childZ[0]).toBeLessThan(0); // 奥へ
  });

  it('入れ子の漏斗は、親セルの中心から子の起点へ伸びる（その場から奥へ）', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    expect(layout.nests).toHaveLength(1);
    const nest = layout.nests[0];
    expect(nest).toMatchObject({
      parentScopeId: 'hotel',
      childScopeId: 'Schedule:x',
      kind: 'nominal', // 連動しない入れ子（名前の規約だけ）
    });

    // from が「親の該当ノードの Schedule:x セルの中心」と厳密に一致すること
    const o = DEFAULT_LAYOUT_3D_OPTIONS;
    const parentPlate = layout.plates.find(
      (p) => p.scopeId === 'hotel' && p.cells.some((c) => c.key === 'Schedule:x')
    );
    const cell = parentPlate?.cells.find((c) => c.key === 'Schedule:x');
    const expected = cellOffset(
      cell?.slot as { col: number; row: number },
      parentPlate?.extentY as number,
      parentPlate?.extentZ as number,
      o.cellPitch
    );
    expect(nest.from[1]).toBeCloseTo((parentPlate?.origin[1] as number) + expected[1], 9);
    expect(nest.from[2]).toBeCloseTo((parentPlate?.origin[2] as number) + expected[2], 9);

    // to は子スコープの起点ノードの位置
    const childRoot = layout.plates.find((p) => p.scopeId === 'Schedule:x' && p.isRoot);
    expect(nest.to).toEqual(childRoot?.origin);
  });

  it('アドレス連動している入れ子は kind: linked になる（描き分けのため）', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({
      rootScopeId: 'hotel',
      graphs,
      isLinked: () => true,
    });
    expect(layout.nests[0].kind).toBe('linked');
  });

  it('分岐は +Y に払い出され、X は動かない（同じ世代は同じ X）', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    const sched = layout.plates.filter((p) => p.scopeId === 'Schedule:x');
    const byDepth = new Map<number, number[]>();
    for (const p of sched) {
      byDepth.set(p.depth, [...(byDepth.get(p.depth) ?? []), p.origin[0]]);
    }
    for (const [, xs] of byDepth) {
      expect(new Set(xs).size).toBe(1); // 同じ世代は必ず同じ X
    }
    // 分岐した2枚は Y が違う
    const depth1 = sched.filter((p) => p.depth === 1);
    expect(depth1).toHaveLength(2);
    expect(depth1[0].origin[1]).not.toBe(depth1[1].origin[1]);
  });

  it('同じオブジェクトは、どのノード・どのスコープでも同じ席', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    const slots = new Map<string, string>();
    for (const p of layout.plates) {
      for (const c of p.cells) {
        const s = `${c.slot.col},${c.slot.row}`;
        const known = slots.get(c.key);
        if (known) expect(s).toBe(known);
        else slots.set(c.key, s);
      }
    }
    expect(slots.size).toBeGreaterThan(0);
  });

  it('決定的（同じ入力なら同じ出力。Math.random / Date.now を使っていない）', () => {
    const { graphs } = hotelLike();
    const a = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    const b = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('nodes のキー順を入れ替えても同じ配置になる', () => {
    const { graphs } = hotelLike();
    const a = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    const json = graphs.hotel.toJSON();
    const shuffled = WorldLineGraph.fromJSON({
      ...json,
      nodes: Object.fromEntries(Object.entries(json.nodes).reverse()),
    });
    const b = computeWorldLine3DLayout({
      rootScopeId: 'hotel',
      graphs: { ...graphs, hotel: shuffled },
    });
    const key = (l: typeof a) =>
      l.plates
        .map((p) => `${p.scopeId}/${p.nodeId}@${p.origin.join(',')}`)
        .sort()
        .join('|');
    expect(key(b)).toBe(key(a));
  });

  it('入れ子を畳んでも、親の板の位置は1座標も動かない', () => {
    const { graphs } = hotelLike();
    const all = computeWorldLine3DLayout({ rootScopeId: 'hotel', graphs });
    const collapsed = computeWorldLine3DLayout({
      rootScopeId: 'hotel',
      graphs,
      collapsedScopeIds: new Set(['Schedule:x']), // 畳む
    });
    const hotelOf = (l: typeof all) =>
      l.plates
        .filter((p) => p.scopeId === 'hotel')
        .map((p) => `${p.nodeId}@${p.origin.join(',')}`)
        .sort();
    expect(hotelOf(collapsed)).toEqual(hotelOf(all));
    expect(collapsed.plates.some((p) => p.scopeId === 'Schedule:x')).toBe(false);
  });

  it('墓標（削除済み）は数えて申告する。2Dインスペクタとの件数差になる', () => {
    const tomb = computeStateHash(null);
    const g = WorldLineGraph.empty()
      .grow([ref('Staff', 's1', { n: 1 })])
      .grow([createStateRef('Staff', 's1', tomb)]);
    const layout = computeWorldLine3DLayout({
      rootScopeId: 'app',
      graphs: { app: g },
      locate: (hash) => (hash === tomb ? 'tombstone' : 'memory'),
    });
    const apex = layout.plates.find((p) => p.isApex);
    expect(apex?.cells.find((c) => c.key === 'Staff:s1')?.status).toBe('tombstone');
    expect(layout.diagnostics.tombstoneCount).toBe(1);
  });

  it('図に出せなかったものを黙って消さず、必ず申告する', () => {
    const g = WorldLineGraph.empty().grow([ref('A', 'a', 1)]);
    const layout = computeWorldLine3DLayout({
      rootScopeId: 'app',
      graphs: { app: g, 'Unreached:q': WorldLineGraph.empty().grow([ref('B', 'b', 1)]) },
    });
    expect(layout.diagnostics.orphanScopeIds).toContain('Unreached:q');
  });

  it('空のグラフでも throw しない', () => {
    const layout = computeWorldLine3DLayout({
      rootScopeId: 'app',
      graphs: { app: WorldLineGraph.empty() },
    });
    expect(layout.plates).toEqual([]);
    expect(layout.bounds.min).toEqual([0, 0, 0]);
  });

  it('間隔を故意に詰めると、重なりを検出して申告する（黙って重ねない）', () => {
    const { graphs } = hotelLike();
    const layout = computeWorldLine3DLayout(
      { rootScopeId: 'hotel', graphs },
      { xStep: 0.01 }
    );
    expect(layout.diagnostics.violations.length).toBeGreaterThan(0);
  });
});
