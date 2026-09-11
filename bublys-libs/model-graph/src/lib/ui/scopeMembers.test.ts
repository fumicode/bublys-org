/**
 * 「どのクラスが、その世界の中に居るか」の判断を固定する。
 *
 * ここを外すと枠が嘘をつく。枠は「一緒に保存され、一緒に巻き戻る範囲」なので、
 * 1つ足りなければ「別々に巻き戻る」と読まれるし、1つ余れば逆のことを言う。
 */
import type { ModelClass, ModelGraph, ModelRelation } from '../domain/ModelGraph.js';
import { scopeMembersOf, type ClassScope } from './scopeMembers.js';

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

const live = (scopeId: string): ClassScope => ({ scopeId, role: 'live' });

describe('世界の中に居るのは誰か', () => {
  /** hotel の形: 集約の根が世界線に載り、その部品も一緒に巻き戻る */
  it('根が載る世界では、内包されている部品も中に居る', () => {
    const g = graph(
      [
        cls('Schedule', { kind: 'aggregate' }),
        cls('Assignment'),
        cls('Day', { kind: 'value' }),
      ],
      [rel('Schedule', 'Assignment'), rel('Assignment', 'Day')]
    );
    const members = scopeMembersOf(g, (n) => (n === 'Schedule' ? live('S:<id>') : undefined));
    expect(members.get('Schedule')).toBe('S:<id>');
    expect(members.get('Assignment')).toBe('S:<id>'); // 部品
    expect(members.get('Day')).toBe('S:<id>'); // 孫まで届く
  });

  /**
   * ★ event-shift-puzzle の形。世界線に載る単位が**集約の根とは限らない**。
   * 記録されるのは根の `ShiftPlan` ではなく、その部品の `Shift` だけ。
   * 根しか見ないとこの宣言を黙って捨てて「どの世界にも属さない」と嘘をつく。
   */
  it('★ 根でない部品が世界線に載ることがある（その宣言を捨てない）', () => {
    const g = graph(
      [cls('ShiftPlan', { kind: 'aggregate' }), cls('Shift'), cls('BlockList', { kind: 'value' })],
      [rel('ShiftPlan', 'Shift', { many: true }), rel('Shift', 'BlockList')]
    );
    const members = scopeMembersOf(g, (n) =>
      n === 'Shift' ? live('shift-plan:<id>') : undefined
    );
    expect(members.get('Shift')).toBe('shift-plan:<id>');
    // Shift と一緒に保存されるものは、一緒に巻き戻る
    expect(members.get('BlockList')).toBe('shift-plan:<id>');
    // 載っていない持ち主は中に居ない。ここを配ると「ShiftPlan も巻き戻る」と嘘になる
    expect(members.has('ShiftPlan')).toBe(false);
  });

  it('自分の宣言が、根の宣言より先', () => {
    const g = graph(
      [cls('Root', { kind: 'aggregate' }), cls('Part')],
      [rel('Root', 'Part')]
    );
    const members = scopeMembersOf(g, (n) =>
      n === 'Root' ? live('root:<id>') : n === 'Part' ? live('part:<id>') : undefined
    );
    expect(members.get('Part')).toBe('part:<id>');
    expect(members.get('Root')).toBe('root:<id>');
  });

  it('焼き付け（pinned）と外（external）は、枠の中に入れない', () => {
    const g = graph([
      cls('Schedule', { kind: 'aggregate' }),
      cls('Staff', { kind: 'aggregate' }),
      cls('Wish', { kind: 'aggregate' }),
    ]);
    const members = scopeMembersOf(g, (n) =>
      n === 'Schedule'
        ? live('S:<id>')
        : n === 'Staff'
          ? { scopeId: 'S:<id>', role: 'pinned' as const }
          : { scopeId: 'app', role: 'external' as const }
    );
    expect(members.has('Staff')).toBe(false); // 外の台帳にも居るので囲わない
    expect(members.has('Wish')).toBe(false);
  });

  it('何も宣言しなければ、誰も世界に居ない（知らないことを描かせない）', () => {
    const g = graph([cls('A', { kind: 'aggregate' }), cls('B')], [rel('A', 'B')]);
    expect(scopeMembersOf(g, () => undefined).size).toBe(0);
  });

  it('2つの世界から内包されていても、答えが揺れない（決定的）', () => {
    const g = graph(
      [cls('Beta', { kind: 'aggregate' }), cls('Alpha', { kind: 'aggregate' }), cls('Shared')],
      [rel('Beta', 'Shared'), rel('Alpha', 'Shared')]
    );
    const scopeOf = (n: string) =>
      n === 'Alpha' ? live('A:<id>') : n === 'Beta' ? live('B:<id>') : undefined;
    const once = scopeMembersOf(g, scopeOf).get('Shared');
    expect(once).toBe('A:<id>'); // クラス名順で先に着いたほう
    expect(scopeMembersOf(g, scopeOf).get('Shared')).toBe(once);
  });

  it('内包していない相手（id 参照）には配らない＝そこが集約と世界の境目', () => {
    const g = graph(
      [cls('Plan', { kind: 'aggregate' }), cls('Member', { kind: 'aggregate' })],
      [rel('Plan', 'Member', { kind: 'references', via: 'memberId', foundBy: 'id-naming' })]
    );
    const members = scopeMembersOf(g, (n) => (n === 'Plan' ? live('P:<id>') : undefined));
    expect(members.has('Member')).toBe(false);
  });
});
