/**
 * レイアウトの詰め方の算術。**図が嘘をつく**種類の欠陥なので、数値で固定する。
 *
 * ここが既存のテストで守れていなかったのは、`grow` が timestamp に Date.now() を入れるため、
 * テスト内のノードが全部1つの時刻クラスタに入って、クラスタ跨ぎの経路を一度も通らないから。
 * だから **timestamp を明示したグラフ**を組み立てて確かめる。
 */
import { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import { createStateRef } from '../../domain/StateRef.js';
import { computeStateHash } from '../../domain/StateHash.js';
import { buildTimeSlots, computeWorldLine3DLayout } from './layout3d.js';

const ref = (t: string, i: string, v: unknown) => createStateRef(t, i, computeStateHash(v));

/** timestamp を明示した一本道のグラフ */
function chain(times: readonly number[], scope: string) {
  const nodes: Record<string, unknown> = {};
  let parent: string | null = null;
  times.forEach((timestamp, i) => {
    const id = `${scope}-${i}`;
    nodes[id] = {
      id,
      parentId: parent,
      timestamp,
      changedRefs: [ref('A', scope, { i })],
      stateHash: `h${i}`,
      worldLineId: 'w',
    };
    parent = id;
  });
  return WorldLineGraph.fromJSON({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodes: nodes as any,
    rootNodeId: `${scope}-0`,
    apexNodeId: `${scope}-${times.length - 1}`,
  });
}

describe('時刻クラスタ', () => {
  it('★ 連打した編集が数珠つなぎで1つの時刻に潰れない', () => {
    // 200ms 間隔の10回。許容 250ms。「直前から近い」で繋ぐと全部1クラスタになり、
    // 1.8 秒離れた両端が「同時に起きたこと」として同じ X に置かれる
    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, timestamp: i * 200 }));
    const slots = buildTimeSlots(nodes, 250);
    expect(new Set(slots.values()).size).toBeGreaterThan(1);
  });

  it('1つのクラスタの実時間の幅は、許容時間を超えない', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, timestamp: i * 100 }));
    const slots = buildTimeSlots(nodes, 250);
    const span = new Map<number, { min: number; max: number }>();
    for (const n of nodes) {
      const s = slots.get(n.id) as number;
      const cur = span.get(s) ?? { min: n.timestamp, max: n.timestamp };
      span.set(s, {
        min: Math.min(cur.min, n.timestamp),
        max: Math.max(cur.max, n.timestamp),
      });
    }
    for (const { min, max } of span.values()) expect(max - min).toBeLessThanOrEqual(250);
  });

  it('本当に同時（許容内）なら同じ時刻にまとまる', () => {
    const slots = buildTimeSlots(
      [
        { id: 'a', timestamp: 1000 },
        { id: 'b', timestamp: 1100 },
        { id: 'c', timestamp: 9000 },
      ],
      250
    );
    expect(slots.get('a')).toBe(slots.get('b'));
    expect(slots.get('c')).not.toBe(slots.get('a'));
  });
});

describe('時間は必ず前へ進む', () => {
  it('★ 同じ時刻の中でのずらしが、次の時刻を追い越さない', () => {
    // 1つのクラスタに6ノード、そのあと大きく離れて1ノード。
    // クラスタ内のずらし幅に上限が無いと、最後の1ノードを追い越して時間が逆流する
    const g = chain([0, 20, 40, 60, 80, 100, 60000], 's');
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });

    for (const e of layout.edges) {
      expect(e.to[0]).toBeGreaterThan(e.from[0]);
    }
    expect(layout.diagnostics.violations).toEqual([]);
  });

  it('板同士が重ならない（同じ座標に2枚置かない）', () => {
    const g = chain([0, 20, 40, 60, 80, 100, 120, 140, 60000], 's');
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const at = layout.plates.map((p) => p.origin.map((n) => n.toFixed(4)).join(','));
    expect(new Set(at).size).toBe(at.length);
  });
});

describe('枝の多い世界と少ない世界が隣り合っても重ならない', () => {
  /** 親の板に2つの子スコープが刺さり、片方だけ枝分かれしている図 */
  function nested() {
    const app = WorldLineGraph.empty().grow([
      ref('Doc', 'a', { n: 0 }),
      ref('Doc', 'b', { n: 0 }),
    ]);
    // a は起点から3分岐、b は一本道
    let a = WorldLineGraph.empty().grow([ref('Doc', 'a', { n: 0 })]);
    const root = a.state.rootNodeId as string;
    a = a.grow([ref('Doc', 'a', { n: 1 })]);
    a = a.moveTo(root).grow([ref('Doc', 'a', { n: 2 })]);
    a = a.moveTo(root).grow([ref('Doc', 'a', { n: 3 })]);
    const b = WorldLineGraph.empty()
      .grow([ref('Doc', 'b', { n: 0 })])
      .grow([ref('Doc', 'b', { n: 1 })]);
    return { app, 'Doc:a': a, 'Doc:b': b };
  }

  it('★ 兄弟スコープの板が同じ座標に乗らない', () => {
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: nested() });
    const at = layout.plates.map(
      (p) => `${p.origin[0].toFixed(3)},${p.origin[1].toFixed(3)},${p.origin[2].toFixed(3)}`
    );
    expect(new Set(at).size).toBe(at.length);
    expect(layout.diagnostics.violations).toEqual([]);
  });

  it('枝の多い世界が隣の世界へはみ出さない（Y の区間が重ならない）', () => {
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: nested() });
    const range = (scopeId: string) => {
      const ps = layout.plates.filter((p) => p.scopeId === scopeId);
      return {
        lo: Math.min(...ps.map((p) => p.origin[1] - p.extentY / 2)),
        hi: Math.max(...ps.map((p) => p.origin[1] + p.extentY / 2)),
      };
    };
    const a = range('Doc:a');
    const b = range('Doc:b');
    expect(a.hi < b.lo || b.hi < a.lo).toBe(true);
  });
});
