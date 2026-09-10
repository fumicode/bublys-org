/**
 * 入れ子スコープの導出。
 *
 * スコープ同士はデータ上フラット（親子関係を持たない）。入れ子は**命名規約**から導く:
 * ある状態に StateRef{type:"Schedule", id:"x"} が居て、graphs に "Schedule:x" が
 * あるなら、そのオブジェクトは自分の世界線を持っている。
 *
 * ただしこの入れ子は**連動しない**。親スコープを時間移動しても子の現在地は動かない
 * （親のノードに「子のどのノードを見ているか」が入っていないため）。
 * 連動するのは universe のアドレス連動型だけ。図では kind で描き分ける
 * （連動しないものを連動するように描いたら嘘になる）。
 */
import type { StateRef } from '../../domain/StateRef.js';

export type NestedScopeResolver = (
  ref: StateRef,
  currentScopeId: string
) => string | null;

/** 既定の規約: `${type}:${id}`。自己参照は入れ子にしない */
export const defaultNestedScopeResolver =
  (hasScope: (scopeId: string) => boolean): NestedScopeResolver =>
  (ref, currentScopeId) => {
    const scopeId = `${ref.type}:${ref.id}`;
    if (scopeId === currentScopeId) return null; // 自己入れ子（hotel の Schedule:x は必ず踏む）
    return hasScope(scopeId) ? scopeId : null;
  };

export type ScopeNode = {
  readonly scopeId: string;
  readonly level: number;
  readonly parentScopeId: string | null;
  /** 親のどのノード・どのセルから生えているか */
  readonly anchor: { readonly nodeId: string; readonly key: string } | null;
  readonly kind: 'root' | 'linked' | 'nominal';
};

export type ScopeTree = {
  readonly scopes: readonly ScopeNode[];
  /** graphs にあるのに図に出ないスコープ（到達しなかった） */
  readonly orphanScopeIds: readonly string[];
  /** ノードが1つも無いスコープ */
  readonly emptyScopeIds: readonly string[];
};

export type ScopeTreeInput = {
  readonly rootScopeId: string;
  /** scopeId → そのスコープに存在するノード数 */
  readonly nodeCountOf: (scopeId: string) => number;
  /** scopeId → 「そのスコープのどのノードに、どの ref が居るか」を列挙する */
  readonly refsOf: (
    scopeId: string
  ) => readonly { readonly nodeId: string; readonly ref: StateRef }[];
  readonly allScopeIds: readonly string[];
  readonly resolve: NestedScopeResolver;
  readonly maxDepth: number;
  /** そのスコープが親とアドレス連動しているか（universe だけ true になる想定） */
  readonly isLinked?: (childScopeId: string, parentScopeId: string) => boolean;
};

export function deriveScopeTree(input: ScopeTreeInput): ScopeTree {
  const scopes: ScopeNode[] = [];
  const seen = new Set<string>();
  const emptyScopeIds: string[] = [];

  const isEmpty = (scopeId: string) => input.nodeCountOf(scopeId) === 0;

  if (isEmpty(input.rootScopeId)) {
    return {
      scopes: [],
      orphanScopeIds: input.allScopeIds.filter((s) => s !== input.rootScopeId),
      emptyScopeIds: [input.rootScopeId],
    };
  }

  scopes.push({
    scopeId: input.rootScopeId,
    level: 0,
    parentScopeId: null,
    anchor: null,
    kind: 'root',
  });
  seen.add(input.rootScopeId);

  // 幅優先。同じ深さから順に潜る（maxDepth で必ず止まる）
  let frontier: ScopeNode[] = [scopes[0]];
  while (frontier.length > 0) {
    const next: ScopeNode[] = [];
    for (const parent of frontier) {
      if (parent.level >= input.maxDepth) continue;
      // 同じ子スコープに複数の ref が解決されうる（Schedule / Availability / Constraints …）。
      // アンカーは1つだけにする（誕生が最も早い ref）。
      const firstAnchor = new Map<string, { nodeId: string; key: string }>();
      for (const { nodeId, ref } of input.refsOf(parent.scopeId)) {
        const childScopeId = input.resolve(ref, parent.scopeId);
        if (!childScopeId) continue;
        if (seen.has(childScopeId)) continue; // 循環と重複を止める
        if (isEmpty(childScopeId)) {
          if (!emptyScopeIds.includes(childScopeId)) emptyScopeIds.push(childScopeId);
          continue;
        }
        if (!firstAnchor.has(childScopeId)) {
          firstAnchor.set(childScopeId, { nodeId, key: `${ref.type}:${ref.id}` });
        }
      }
      for (const [childScopeId, anchor] of firstAnchor) {
        seen.add(childScopeId);
        const node: ScopeNode = {
          scopeId: childScopeId,
          level: parent.level + 1,
          parentScopeId: parent.scopeId,
          anchor,
          kind: input.isLinked?.(childScopeId, parent.scopeId) ? 'linked' : 'nominal',
        };
        scopes.push(node);
        next.push(node);
      }
    }
    frontier = next;
  }

  const orphanScopeIds = input.allScopeIds.filter(
    (s) => !seen.has(s) && !emptyScopeIds.includes(s)
  );
  for (const s of input.allScopeIds) {
    if (isEmpty(s) && !emptyScopeIds.includes(s)) emptyScopeIds.push(s);
  }
  return { scopes, orphanScopeIds, emptyScopeIds };
}
