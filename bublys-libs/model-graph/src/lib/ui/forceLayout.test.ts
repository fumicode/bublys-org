/**
 * 力学配置。**乱数を使わない**ことと、狙い（近い概念が近くに来る）が
 * 崩れていないことを固定する。
 */
import type { ModelClass, ModelGraph, ModelRelation } from '../domain/ModelGraph.js';
import { layoutClassDiagram } from './classLayout.js';
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

/**
 * 焼き付けの写し。**同じものが外の台帳と世界の中の両方に居る**ことを描くための箱。
 * 片方にしか描かないとどちらかが嘘になる。
 */
describe('焼き付けの写し', () => {
  const g = graph([
    // 中身のあるクラスにしておく。空のクラスだと「写しのほうが低い」が測れない
    cls('Staff', {
      kind: 'aggregate',
      fields: [
        { name: 'id', type: 'string', optional: false },
        { name: 'name', type: 'string', optional: false },
      ],
      methods: [
        { name: 'rename', params: ['name'], returns: 'Staff', isStatic: false, returnsSelf: true },
      ],
    }),
    cls('Schedule', { kind: 'aggregate' }),
    cls('Constraints', { kind: 'aggregate' }),
    cls('Outside', { kind: 'aggregate' }),
  ]);
  const echoes = [
    {
      of: 'Staff',
      scopeId: 'Schedule:<id>',
      near: 'Schedule',
      members: ['Schedule', 'Constraints'],
    },
  ];
  const inScope = (n: string) => (n === 'Schedule' || n === 'Constraints' ? 'Schedule:<id>' : undefined);

  it('写し元は消えず、写しが増える（両方に居る）', () => {
    const { boxes } = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    expect(boxes.filter((b) => b.name === 'Staff')).toHaveLength(1);
    const echo = boxes.find((b) => b.echoOf === 'Staff');
    expect(echo).toBeTruthy();
    expect(echo?.echoScopeId).toBe('Schedule:<id>');
  });

  it('写しは中身を書かないが、幅は本物と同じ（脚注に見えると行き先として読めない）', () => {
    const { boxes } = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    const origin = boxes.find((b) => b.name === 'Staff') as (typeof boxes)[number];
    const echo = boxes.find((b) => b.echoOf === 'Staff') as (typeof boxes)[number];
    // 中身は書かない（もう一度書いても読むものは増えない）
    expect(echo.shownFields).toBe(0);
    expect(echo.shownMethods).toBe(0);
    expect(echo.height).toBeLessThan(origin.height);
    // ★ でも幅は同じ。小さくすると「世界の中からの矢印が向かう先」として読めない
    expect(echo.width).toBe(origin.width);
  });

  it('★ 写しは焼き付け先の世界のほうに寄る（写し元に引き戻されない）', () => {
    const { boxes } = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    const at = (n: string) => boxes.find((b) => b.name === n) as (typeof boxes)[number];
    const echo = boxes.find((b) => b.echoOf === 'Staff') as (typeof boxes)[number];
    // 写しは、その世界の相手（Schedule）に、世界の外のもの（Outside）より近い
    expect(dist(echo, at('Schedule'))).toBeLessThan(dist(echo, at('Outside')));
  });

  it('写しは関係の線を増やさない（同じオブジェクトなので、つながりは写し元のもの）', () => {
    const withRel = graph(
      [cls('Staff', { kind: 'aggregate' }), cls('Schedule', { kind: 'aggregate' })],
      [rel('Schedule', 'Staff', { kind: 'references', via: 'staffId' })]
    );
    const plain = layoutClassDiagramByForce(withRel);
    const withEcho = layoutClassDiagramByForce(withRel, {}, {}, inScope, echoes);
    expect(withEcho.edges).toHaveLength(plain.edges.length);
  });

  it('写し元が図に無ければ、写しも作らない', () => {
    const { boxes } = layoutClassDiagramByForce(
      g,
      {},
      {},
      inScope,
      [{ of: 'NotThere', scopeId: 'Schedule:<id>', near: 'Schedule', members: ['Schedule'] }]
    );
    expect(boxes.some((b) => b.echoOf)).toBe(false);
  });

  it('列の配置でも、写しはその世界の列に入る', () => {
    const layout = layoutClassDiagram(g, {}, echoes);
    const echo = layout.boxes.find((b) => b.echoOf === 'Staff') as (typeof layout.boxes)[number];
    const near = layout.boxes.find((b) => b.name === 'Schedule') as (typeof layout.boxes)[number];
    expect(echo.x).toBe(near.x);
    expect(echo.y).toBeGreaterThan(near.y);
  });
});

/**
 * ★ 世界の中から焼き付けメンバーへ伸びる線は、**写しのほうへ**つなぐ。
 * 世界の中から見えているのは焼き付けたほうで、外の台帳のほうではない。
 * 外につなぐと「この世界のものが外を見ている」という嘘になる。
 */
describe('世界の中からの線は、写しにつなぐ', () => {
  const classes = [
    cls('Staff', { kind: 'aggregate' }),
    cls('Schedule', { kind: 'aggregate' }),
    cls('Assignment'), // Schedule の部品。ここから Staff を参照する
    cls('Wish', { kind: 'aggregate' }), // 世界の外から Staff を参照する
  ];
  const relations = [
    rel('Schedule', 'Assignment'),
    rel('Assignment', 'Staff', { kind: 'references', via: 'staffId', foundBy: 'id-naming' }),
    rel('Wish', 'Staff', { kind: 'references', via: 'staffId', foundBy: 'id-naming' }),
  ];
  const g = graph(classes, relations);
  const echoes = [
    {
      of: 'Staff',
      scopeId: 'Schedule:<id>',
      near: 'Schedule',
      // 部品も世界の中（根と一緒に保存され、一緒に巻き戻る）
      members: ['Schedule', 'Assignment'],
    },
  ];
  const inScope = (n: string) =>
    n === 'Schedule' || n === 'Assignment' ? 'Schedule:<id>' : undefined;

  const endOf = (layout: ReturnType<typeof layoutClassDiagramByForce>, from: string) => {
    const e = layout.edges.find((x) => x.relation.from === from && x.relation.to === 'Staff');
    const box = layout.boxes.find(
      (b) => Math.abs(b.y + b.height / 2 - (e?.to.y ?? -1)) < 0.5 &&
        (Math.abs(b.x - (e?.to.x ?? -1)) < 0.5 || Math.abs(b.x + b.width - (e?.to.x ?? -1)) < 0.5)
    );
    return box?.name;
  };

  it('★ 世界の中の部品からの線は、写しに届く', () => {
    const layout = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    expect(endOf(layout, 'Assignment')).toBe('Staff@Schedule:<id>');
  });

  it('★ 世界の外からの線は、外の箱に届く（付け替えない）', () => {
    const layout = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    expect(endOf(layout, 'Wish')).toBe('Staff');
  });

  it('線の数は変わらない（付け替えであって、増やしてはいない）', () => {
    const plain = layoutClassDiagramByForce(g);
    const withEcho = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    expect(withEcho.edges).toHaveLength(plain.edges.length);
  });

  it('列の配置でも同じように付け替わる', () => {
    const layout = layoutClassDiagram(g, {}, echoes);
    const e = layout.edges.find(
      (x) => x.relation.from === 'Assignment' && x.relation.to === 'Staff'
    );
    const echo = layout.boxes.find((b) => b.echoOf === 'Staff') as (typeof layout.boxes)[number];
    expect(e?.to.y).toBeCloseTo(echo.y + echo.height / 2, 6);
  });
});

/**
 * ★ 枠は「その世界に居るもの」を囲う。**メンバーでない箱が枠の中に入ってはいけない。**
 *
 * 枠はメンバーの外接矩形なので、力学配置がメンバーでない箱をその範囲に置くと
 * 黙って飲み込まれる。実際、焼き付け元の Staff（世界の外に居る）が枠の中に入り、
 * 「外の Staff」と「中の写し」が両方とも枠の中、という絵になった。
 */
describe('枠の中に、その世界のものでない箱を入れない', () => {
  const frameOf = (l: ReturnType<typeof layoutClassDiagramByForce>, scopeId: string) => {
    const members = l.boxes.filter(
      (b) => b.echoScopeId === scopeId || (!b.echoOf && inScopeNames.includes(b.name))
    );
    return {
      x0: Math.min(...members.map((m) => m.x)),
      y0: Math.min(...members.map((m) => m.y)),
      x1: Math.max(...members.map((m) => m.x + m.width)),
      y1: Math.max(...members.map((m) => m.y + m.height)),
      members,
    };
  };
  const inScopeNames = ['Schedule', 'Assignment', 'Constraints', 'Rule'];
  const classes = [
    cls('Staff', { kind: 'aggregate' }),
    cls('Schedule', { kind: 'aggregate' }),
    cls('Assignment'),
    cls('Constraints', { kind: 'aggregate' }),
    cls('Rule'),
    cls('Wish', { kind: 'aggregate' }),
    cls('Report', { kind: 'aggregate' }),
    cls('Violation'),
  ];
  const relations = [
    rel('Schedule', 'Assignment'),
    rel('Constraints', 'Rule'),
    rel('Assignment', 'Staff', { kind: 'references', via: 'staffId', foundBy: 'id-naming' }),
    rel('Rule', 'Staff', { kind: 'references', via: 'staffId', foundBy: 'id-naming' }),
    rel('Wish', 'Staff', { kind: 'references', via: 'staffId', foundBy: 'id-naming' }),
    rel('Violation', 'Staff', { kind: 'references', via: 'staffId', foundBy: 'id-naming' }),
    rel('Report', 'Schedule', { kind: 'references', via: 'scheduleId', foundBy: 'id-naming' }),
  ];
  const g = graph(classes, relations);
  const inScope = (n: string) => (inScopeNames.includes(n) ? 'Schedule:<id>' : undefined);
  const echoes = [
    { of: 'Staff', scopeId: 'Schedule:<id>', near: 'Schedule', members: inScopeNames },
  ];

  it('★ 焼き付け元（世界の外）が枠の中に入らない', () => {
    const layout = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    const f = frameOf(layout, 'Schedule:<id>');
    const staff = layout.boxes.find((b) => b.name === 'Staff') as (typeof layout.boxes)[number];
    const overlaps =
      staff.x < f.x1 && f.x0 < staff.x + staff.width &&
      staff.y < f.y1 && f.y0 < staff.y + staff.height;
    expect(overlaps).toBe(false);
  });

  it('★ 世界の外のものが1つも枠の中に入らない', () => {
    const layout = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    const f = frameOf(layout, 'Schedule:<id>');
    const inside = layout.boxes
      .filter((b) => !f.members.includes(b))
      .filter(
        (b) => b.x < f.x1 && f.x0 < b.x + b.width && b.y < f.y1 && f.y0 < b.y + b.height
      )
      .map((b) => b.name);
    expect(inside).toEqual([]);
  });

  it('押し出したあとも、箱同士は重ならない', () => {
    const { boxes } = layoutClassDiagramByForce(g, {}, {}, inScope, echoes);
    for (const a of boxes) {
      for (const b of boxes) {
        if (a === b) continue;
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });
});
