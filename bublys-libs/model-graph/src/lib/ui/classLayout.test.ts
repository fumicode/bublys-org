/**
 * 配置は「集約の境界が図の骨格になる」ことを狙っている。
 * その狙いが崩れていないかを数値で固定する。
 */
import type { ModelClass, ModelGraph, ModelRelation } from '../domain/ModelGraph.js';
import {
  assignAggregates,
  finishLayout,
  layoutClassDiagram,
  type ClassBox,
} from './classLayout.js';

const cls = (name: string, over: Partial<ModelClass> = {}): ModelClass => ({
  name,
  file: `${name}.ts`,
  kind: 'part',
  fields: [],
  getters: [],
  methods: [],
  ...over,
});

const rel = (from: string, to: string, over: Partial<ModelRelation> = {}): ModelRelation => ({
  from,
  to,
  kind: 'contains',
  via: 'x',
  many: false,
  foundBy: 'type',
  ...over,
});

const graph = (
  classes: ModelClass[],
  relations: ModelRelation[] = []
): ModelGraph => ({
  classes,
  relations,
  diagnostics: {
    sourceRoot: '',
    fileCount: 0,
    classesWithoutState: [],
    unresolvedTypes: [],
    unresolvedIdFields: [],
  },
});

describe('どの集約に属するか', () => {
  it('根から内包を辿って届く範囲が、その集約', () => {
    const g = graph(
      [cls('Order', { kind: 'aggregate' }), cls('Line'), cls('Money', { kind: 'value' })],
      [rel('Order', 'Line'), rel('Line', 'Money')]
    );
    const owner = assignAggregates(g);
    expect(owner.get('Line')).toBe('Order');
    expect(owner.get('Money')).toBe('Order'); // 孫まで届く
  });

  it('id で参照しているだけのものは、その集約に入らない（境界をまたぐ）', () => {
    const g = graph(
      [cls('Order', { kind: 'aggregate' }), cls('Customer', { kind: 'aggregate' })],
      [rel('Order', 'Customer', { kind: 'references', foundBy: 'id-naming' })]
    );
    expect(assignAggregates(g).get('Customer')).toBe('Customer');
  });

  it('★ 2つの集約から内包されている部品は、片方に決める（決定的に）', () => {
    const g = graph(
      [cls('Beta', { kind: 'aggregate' }), cls('Alpha', { kind: 'aggregate' }), cls('Day')],
      [rel('Beta', 'Day'), rel('Alpha', 'Day')]
    );
    // 根の名前順で決めるので、何度計算しても同じ答えになる
    expect(assignAggregates(g).get('Day')).toBe('Alpha');
    expect(assignAggregates(g).get('Day')).toBe('Alpha');
  });

  it('どの根からも届かないものは、自分が自分の集約', () => {
    const g = graph([cls('Loose')]);
    expect(assignAggregates(g).get('Loose')).toBe('Loose');
  });
});

describe('配置', () => {
  const g = graph(
    [
      cls('Order', { kind: 'aggregate', fields: [{ name: 'id', type: 'string', optional: false }] }),
      cls('Line'),
      cls('Customer', { kind: 'aggregate' }),
    ],
    [rel('Order', 'Line'), rel('Order', 'Customer', { kind: 'references', via: 'customerId' })]
  );

  it('同じ集約は同じ列に、別の集約は別の列に置く', () => {
    const { boxes } = layoutClassDiagram(g);
    const at = (n: string) => boxes.find((b) => b.name === n);
    expect(at('Order')?.x).toBe(at('Line')?.x); // 内側は縦に積む
    expect(at('Customer')?.x).not.toBe(at('Order')?.x);
    expect(at('Line')?.y).toBeGreaterThan(at('Order')?.y as number); // 根が上
  });

  it('★ 箱同士が重ならない', () => {
    const { boxes } = layoutClassDiagram(g);
    for (const a of boxes) {
      for (const b of boxes) {
        if (a === b) continue;
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it('線が集約の境界をまたぐかどうかを持つ（そこが図の読みどころ）', () => {
    const { edges } = layoutClassDiagram(g);
    expect(edges.find((e) => e.relation.to === 'Line')?.withinAggregate).toBe(true);
    expect(edges.find((e) => e.relation.to === 'Customer')?.withinAggregate).toBe(false);
  });

  it('相手が図に無い線は引かずに申告する（黙って消さない）', () => {
    const broken = graph([cls('Order', { kind: 'aggregate' })], [rel('Order', 'Ghost')]);
    const layout = layoutClassDiagram(broken);
    expect(layout.edges).toEqual([]);
    expect(layout.diagnostics.danglingRelations).toEqual(['Order.x → Ghost']);
  });

  it('中身の多いクラスほど箱が高くなる', () => {
    const many = graph([
      cls('A', {
        kind: 'aggregate',
        fields: Array.from({ length: 5 }, (_, i) => ({
          name: `f${i}`,
          type: 'string',
          optional: false,
        })),
      }),
      cls('B', { kind: 'aggregate' }),
    ]);
    const { boxes } = layoutClassDiagram(many);
    const a = boxes.find((b) => b.name === 'A');
    const b = boxes.find((x) => x.name === 'B');
    expect(a?.height).toBeGreaterThan(b?.height as number);
  });

  it('★ 行が多すぎるクラスは省略して、省略したことが分かる形にする', () => {
    const huge = graph([
      cls('A', {
        kind: 'aggregate',
        fields: Array.from({ length: 40 }, (_, i) => ({
          name: `f${i}`,
          type: 'string',
          optional: false,
        })),
      }),
    ]);
    const box = layoutClassDiagram(huge, { maxFields: 5 }).boxes[0];
    expect(box.shownFields).toBe(5);
    expect(box.cls.fields.length).toBe(40); // 元の数は保つ（「ほか N 件」を出すため）
  });

  it('同じ入力なら同じ配置（決定的）', () => {
    expect(JSON.stringify(layoutClassDiagram(g))).toBe(JSON.stringify(layoutClassDiagram(g)));
  });
});

/**
 * ★ 線の口は箱の**縁の上に並べる**。同じ点に集めると、何本来ていても1本にしか
 * 見えないうえ、矢尻どうしが完全に重なって「つながっていない」ようにすら見える。
 */
describe('同じ縁に届く線', () => {
  const many = graph(
    [
      cls('Hub', { kind: 'aggregate' }),
      cls('A', { kind: 'aggregate' }),
      cls('B', { kind: 'aggregate' }),
      cls('C', { kind: 'aggregate' }),
    ],
    [
      rel('A', 'Hub', { kind: 'references', via: 'hubId' }),
      rel('B', 'Hub', { kind: 'references', via: 'hubId' }),
      rel('C', 'Hub', { kind: 'references', via: 'hubId' }),
    ]
  );

  it('★ 同じ箱に届く線どうしが同じ点で終わらない', () => {
    const { edges } = layoutClassDiagram(many);
    expect(edges).toHaveLength(3);
    for (const a of edges) {
      for (const b of edges) {
        if (a === b) continue;
        expect(Math.hypot(a.to.x - b.to.x, a.to.y - b.to.y)).toBeGreaterThan(4);
      }
    }
  });

  it('口はその箱の縁の上にある（並べても箱から離れない）', () => {
    const layout = layoutClassDiagram(many);
    const hub = layout.boxes.find((b) => b.name === 'Hub') as (typeof layout.boxes)[number];
    for (const e of layout.edges) {
      expect(Math.min(Math.abs(e.to.x - hub.x), Math.abs(e.to.x - (hub.x + hub.width)))).toBeLessThan(0.5);
      expect(e.to.y).toBeGreaterThanOrEqual(hub.y);
      expect(e.to.y).toBeLessThanOrEqual(hub.y + hub.height);
    }
  });

  it('1本しか来ない縁は、これまで通り縁の中点', () => {
    const one = graph(
      [cls('A', { kind: 'aggregate' }), cls('Hub', { kind: 'aggregate' })],
      [rel('A', 'Hub', { kind: 'references', via: 'hubId' })]
    );
    const layout = layoutClassDiagram(one);
    const hub = layout.boxes.find((b) => b.name === 'Hub') as (typeof layout.boxes)[number];
    expect(layout.edges[0].to.y).toBeCloseTo(hub.y + hub.height / 2, 6);
  });

  it('相手が上にある線ほど上の口に付く（線が交差しない）', () => {
    const layout = layoutClassDiagram(many);
    const at = (n: string) => layout.boxes.find((b) => b.name === n) as (typeof layout.boxes)[number];
    const endOf = (from: string) =>
      layout.edges.find((e) => e.relation.from === from)?.to.y as number;
    const byFrom = ['A', 'B', 'C'].sort((x, y) => at(x).y - at(y).y);
    expect(endOf(byFrom[0])).toBeLessThan(endOf(byFrom[1]));
    expect(endOf(byFrom[1])).toBeLessThan(endOf(byFrom[2]));
  });
});

/**
 * ★ 線は**相手の箱の外から**入る。
 *
 * 中心の左右だけで縁を選ぶと、横に重なった箱どうしで線が**後ろ向きに走る**。
 * 矢尻は進行方向を向くので相手の箱の中に食い込み、あとから描かれる箱に
 * 塗りつぶされる——「矢印が1本もつながっていない」に見える。実際に見えなかった。
 */
describe('線は箱の外から入る', () => {
  const at = (name: string, x: number, y: number): ClassBox => ({
    name,
    cls: cls(name, { kind: 'aggregate' }),
    x,
    y,
    width: 240,
    height: 100,
    aggregate: name,
    shownFields: 0,
    shownMethods: 0,
  });

  /** その口が乗っている縁から見て、制御点が箱の外にあるか */
  const outward = (c: { x: number; y: number }, port: { x: number; y: number }, b: ClassBox) => {
    if (Math.abs(port.x - b.x) < 0.5) return c.x <= port.x + 0.5; // 左の縁
    if (Math.abs(port.x - (b.x + b.width)) < 0.5) return c.x >= port.x - 0.5; // 右の縁
    if (Math.abs(port.y - b.y) < 0.5) return c.y <= port.y + 0.5; // 上の縁
    return c.y >= port.y - 0.5; // 下の縁
  };

  const g = graph(
    [
      cls('Upper', { kind: 'aggregate' }),
      cls('Lower', { kind: 'aggregate' }),
      cls('Side', { kind: 'aggregate' }),
    ],
    [
      // 横に重なって縦に積まれた相手（ここが壊れていた）
      rel('Upper', 'Lower', { kind: 'references', via: 'lowerId' }),
      // 横に並んだ相手（これまで通り横の縁で結ぶ）
      rel('Upper', 'Side', { kind: 'references', via: 'sideId' }),
    ]
  );
  // Upper と Lower は x が重なっている。Side は完全に右
  const placed = [at('Upper', 100, 0), at('Lower', 40, 300), at('Side', 600, 0)];

  it('★ 横に重なった箱どうしは、上下の縁で結ぶ', () => {
    const layout = finishLayout(g, placed);
    const e = layout.edges.find((x) => x.relation.to === 'Lower') as (typeof layout.edges)[number];
    expect(e.from.y).toBeCloseTo(100, 6); // Upper の下の縁
    expect(e.to.y).toBeCloseTo(300, 6); // Lower の上の縁
  });

  it('横に並んだ箱どうしは、これまで通り横の縁で結ぶ', () => {
    const layout = finishLayout(g, placed);
    const e = layout.edges.find((x) => x.relation.to === 'Side') as (typeof layout.edges)[number];
    expect(e.from.x).toBeCloseTo(340, 6); // Upper の右の縁
    expect(e.to.x).toBeCloseTo(600, 6); // Side の左の縁
  });

  it('★ どの線も、最後の制御点が相手の箱の外にある（矢尻が箱に潜らない）', () => {
    const layout = finishLayout(g, placed);
    expect(layout.edges).toHaveLength(2);
    for (const e of layout.edges) {
      const target = placed.find((b) => b.name === e.relation.to) as ClassBox;
      const source = placed.find((b) => b.name === e.relation.from) as ClassBox;
      expect(outward(e.c2, e.to, target)).toBe(true);
      expect(outward(e.c1, e.from, source)).toBe(true);
    }
  });
});
