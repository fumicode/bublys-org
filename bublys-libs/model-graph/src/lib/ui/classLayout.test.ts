/**
 * 配置は「集約の境界が図の骨格になる」ことを狙っている。
 * その狙いが崩れていないかを数値で固定する。
 */
import type { ModelClass, ModelGraph, ModelRelation } from '../domain/ModelGraph.js';
import { assignAggregates, layoutClassDiagram } from './classLayout.js';

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
