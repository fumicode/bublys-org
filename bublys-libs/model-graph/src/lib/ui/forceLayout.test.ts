/**
 * 力学配置。**乱数を使わない**ことと、狙い（近い概念が近くに来る）が
 * 崩れていないことを固定する。
 */
import type { ModelClass, ModelGraph, ModelRelation } from '../domain/ModelGraph.js';
import { layoutClassDiagramByForce } from './forceLayout.js';

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
const graph = (classes: ModelClass[], relations: ModelRelation[] = []): ModelGraph => ({
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

const center = (b: { x: number; y: number; width: number; height: number }) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});
const dist = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) => Math.hypot(center(a).x - center(b).x, center(a).y - center(b).y);

describe('力学配置', () => {
  it('★ 決定的（乱数を使っていない）。同じ入力なら何度計算しても同じ', () => {
    const g = graph(
      [cls('A', { kind: 'aggregate' }), cls('B'), cls('C', { kind: 'aggregate' })],
      [rel('A', 'B')]
    );
    const a = layoutClassDiagramByForce(g);
    const b = layoutClassDiagramByForce(g);
    expect(JSON.stringify(a.boxes)).toBe(JSON.stringify(b.boxes));
  });

  it('★ つながっているものは、つながっていないものより近くに来る', () => {
    const g = graph(
      [
        cls('A', { kind: 'aggregate' }),
        cls('B'),
        cls('Far', { kind: 'aggregate' }),
        cls('Far2'),
      ],
      [rel('A', 'B'), rel('Far', 'Far2')]
    );
    const { boxes } = layoutClassDiagramByForce(g);
    const at = (n: string) => boxes.find((b) => b.name === n) as (typeof boxes)[number];
    expect(dist(at('A'), at('B'))).toBeLessThan(dist(at('A'), at('Far')));
    expect(dist(at('Far'), at('Far2'))).toBeLessThan(dist(at('Far'), at('B')));
  });

  it('★ 箱が重ならない', () => {
    const g = graph(
      Array.from({ length: 12 }, (_, i) =>
        cls(`C${i}`, { kind: i % 3 === 0 ? 'aggregate' : 'part' })
      ),
      [rel('C0', 'C1'), rel('C0', 'C2'), rel('C3', 'C4')]
    );
    const { boxes } = layoutClassDiagramByForce(g);
    for (const a of boxes) {
      for (const b of boxes) {
        if (a === b) continue;
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it('注入したまとまり（世界線スコープ）が、つながりが無くても寄る', () => {
    const classes = [
      cls('S1', { kind: 'aggregate' }),
      cls('S2', { kind: 'aggregate' }),
      cls('Other', { kind: 'aggregate' }),
    ];
    const plain = layoutClassDiagramByForce(graph(classes));
    const grouped = layoutClassDiagramByForce(graph(classes), {}, {}, (n) =>
      n.startsWith('S') ? 'scope:S' : undefined
    );
    const gap = (l: typeof plain) => {
      const at = (n: string) => l.boxes.find((b) => b.name === n) as (typeof l.boxes)[number];
      return dist(at('S1'), at('S2'));
    };
    expect(gap(grouped)).toBeLessThan(gap(plain));
  });

  it('全部が図の内側（正の座標）に収まる', () => {
    const g = graph([cls('A', { kind: 'aggregate' }), cls('B'), cls('C')], [rel('A', 'B')]);
    const layout = layoutClassDiagramByForce(g);
    for (const b of layout.boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(layout.width);
      expect(b.y + b.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('空でも壊れない', () => {
    const layout = layoutClassDiagramByForce(graph([]));
    expect(layout.boxes).toEqual([]);
  });
});

describe('束ねの強さ', () => {
  /**
   * ★ 世界線スコープは**枠で囲う**ので、メンバーが図全体に散ると囲う意味が無くなる。
   * 「同じスコープの広がり」が「図全体の広がり」より十分小さいことを固定する。
   */
  it('同じスコープのメンバーは、図全体よりずっと狭い範囲に集まる', () => {
    const names = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const others = ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'];
    const g = graph(
      [...names, ...others].map((n) => cls(n, { kind: 'aggregate' })),
      []
    );
    const layout = layoutClassDiagramByForce(g, {}, {}, (n) =>
      names.includes(n) ? 'scope:S' : undefined
    );
    const at = (n: string) => layout.boxes.find((b) => b.name === n) as (typeof layout.boxes)[number];
    const spread = (list: string[]) => {
      const cs = list.map(at).map(center);
      return Math.hypot(
        Math.max(...cs.map((c) => c.x)) - Math.min(...cs.map((c) => c.x)),
        Math.max(...cs.map((c) => c.y)) - Math.min(...cs.map((c) => c.y))
      );
    };
    expect(spread(names)).toBeLessThan(spread([...names, ...others]) * 0.7);
  });
});
