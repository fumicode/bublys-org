/**
 * 「どのクラスが、どの世界線スコープの中に居るか」を決める。**純粋関数だけ。**
 *
 * 配置や描画と分けてあるのは、ここが**判断**だからだ。バブリが宣言するのは
 * 「この型はこの世界に載る」という一部分だけで、図に要るのは「一緒に保存され、
 * 一緒に巻き戻る範囲」の全体。その差を埋めるのがこの関数で、外すことがある。
 */
import type { ModelGraph } from '../domain/ModelGraph.js';
import { assignAggregates } from './classLayout.js';

/** そのクラスが属する世界線スコープ */
export type ClassScope = {
  /** スコープID。`Schedule:<id>` のような形 */
  readonly scopeId: string;
  /** その世界での立場 */
  readonly role: 'live' | 'pinned' | 'external';
};

/** クラス名 → その世界線スコープ（バブリ側から注入する。知らないものは undefined） */
export type ScopeOf = (className: string) => ClassScope | undefined;

/**
 * クラス名 → 「一緒に巻き戻る世界」のスコープID。
 *
 * 規則は2つだけ。
 *
 * 1. **起点は自分の宣言が先、無ければ集約の根の宣言。**
 *    世界線に載る単位が集約の根とは限らない。hotel は根（`MonthlyStaffSchedule`）が
 *    載るが、event-shift-puzzle は根の `ShiftPlan` ではなく、その部品の `Shift` だけが
 *    載る。根しか見ないと後者の宣言を黙って捨てて「どの世界にも属さない」と嘘をつく。
 *
 * 2. **内包をたどって配る。** 内包されているものは宣言されていなくても、
 *    持ち主と一緒に保存され、一緒に巻き戻る。つまり同じ世界の中に居る
 *    （`ShiftAssignment`・`BlockList` など）。
 *
 * `live` だけを配る。`pinned` は外の台帳にも居るので枠の中には入れないし、
 * `external` はそもそも世界に属さない。
 *
 * 同じ部品が2つの世界から内包されている場合は**クラス名順で先に着いたほうに決める**
 * （決定的にするため。実際には両方に属している）。
 */
export function scopeMembersOf(graph: ModelGraph, scopeOf: ScopeOf): Map<string, string> {
  const out = new Map<string, string>();
  const owner = assignAggregates(graph);
  const contains = new Map<string, string[]>();
  for (const r of graph.relations) {
    if (r.kind !== 'contains') continue;
    contains.set(r.from, [...(contains.get(r.from) ?? []), r.to]);
  }

  for (const c of [...graph.classes].sort((a, b) => a.name.localeCompare(b.name))) {
    const root = owner.get(c.name);
    const declared = scopeOf(c.name) ?? (root ? scopeOf(root) : undefined);
    if (declared?.role !== 'live') continue;
    const stack = [c.name];
    while (stack.length > 0) {
      const name = stack.pop() as string;
      if (out.has(name)) continue;
      out.set(name, declared.scopeId);
      for (const child of contains.get(name) ?? []) if (!out.has(child)) stack.push(child);
    }
  }
  return out;
}
