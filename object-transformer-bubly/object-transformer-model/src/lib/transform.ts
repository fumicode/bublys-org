/**
 * ソースオブジェクト[] × MappingRule → ターゲットオブジェクト[] の変換実行ロジック
 *
 * path（dot-notation）で source から値を取り、target の同じ path に置く。
 * 途中のオブジェクトは必要に応じて自動生成される。
 */

import { arrayNameOf, isElementStep, stringToPath } from "@bublys-org/domain-registry/schema";
import type { MappingRule, ValueTransform } from "./MappingRule.js";

/** 過去互換のための型（csv-importer の PlaneObject が満たす形） */
export type PlaneObjectLike = Record<string, unknown> & {
  id: string;
  name: string;
};

/**
 * path の位置の値を取得。
 *
 * ★ **並びの中を指す段（`blocks[]`）は「最初の一つ」。** 読むのは見本を出すためなので、
 *   どれか一つで足りる ── 何番目かを書かないのは、書くときに「新しい一つ」と
 *   読み替えるため（`ELEMENT_SUFFIX` の註）。
 */
export function getAtPath(obj: unknown, path: readonly string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") {
      return undefined;
    }
    const next = (cur as Record<string, unknown>)[arrayNameOf(key)];
    cur = isElementStep(key) ? (Array.isArray(next) ? next[0] : undefined) : next;
  }
  return cur;
}

/** その段は「何番目」か（並びの中の位置） */
const isIndexStep = (step: string): boolean => /^\d+$/.test(step);

/**
 * path の位置に値を置く。途中が無ければ作る。
 *
 * ★ **作るものは次の段が決める。** 次が「何番目」なら並び、そうでなければもの ──
 *   一律にものを作っていたころは `blocks.0.content` が
 *   `{ blocks: { "0": … } }`（番号を名前に持つ**もの**）になり、
 *   受け取った側には並びとして読めなかった。
 */
export function setAtPath(
  obj: Record<string, unknown>,
  path: readonly string[],
  value: unknown
): void {
  if (path.length === 0) return;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const next = cur[key];
    if (next === null || next === undefined || typeof next !== "object") {
      cur[key] = isIndexStep(path[i + 1]) ? [] : {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[path[path.length - 1]] = value;
}

/** 単一値の変換 */
export function applyTransform(value: unknown, transform: ValueTransform): unknown {
  switch (transform.type) {
    case "identity":
      return value;
    case "toNumber": {
      const s = typeof value === "string" ? value : String(value);
      const n = Number(s);
      return isNaN(n) ? value : n;
    }
    case "toBoolean": {
      const s = typeof value === "string" ? value : String(value);
      return transform.trueValues.includes(s);
    }
    case "dictionary": {
      const s = typeof value === "string" ? value : String(value);
      return transform.map[s] ?? value;
    }
  }
}

/** その繋ぎ先は並びの中か */
const intoArray = (m: MappingRule["mappings"][number]): boolean =>
  stringToPath(m.targetPath).some(isElementStep);

/** 並びの中を指す段を「何番目」に開く（`blocks[].content` の 2 番目 → `blocks.2.content`） */
const atIndex = (path: readonly string[], index: number): string[] =>
  path.flatMap((step) => (isElementStep(step) ? [arrayNameOf(step), String(index)] : [step]));

/** 1 件のソースから、繋ぎに従って値を置く */
const fill = (
  into: Record<string, unknown>,
  src: unknown,
  mappings: MappingRule["mappings"],
  pathOf: (m: MappingRule["mappings"][number]) => readonly string[],
): void => {
  for (const m of mappings) {
    const raw = getAtPath(src, stringToPath(m.sourcePath));
    if (raw !== undefined) setAtPath(into, pathOf(m), applyTransform(raw, m.transform));
  }
};

/**
 * ソースの並びを、繋ぎに従って変換する。
 *
 * > **並びの中へ繋いだら、ソース 1 件は「要素 1 つ」になる。**
 *
 * ★ 繋ぎ先がぜんぶ並びの外なら、これまでどおり **1 件 → 1 つ**（N 件で N 個）。
 * ★ 並びの中への繋ぎが 1 つでもあれば、**N 件 → ひとつのもの**になる ──
 *   ソース 1 件ごとに要素が 1 つできて、同じ並びに積まれていく
 *   （CSV を 100 行落とせば、段落が 100 並んだメモが 1 つ）。
 *   並びの外へ繋いだ項目は**最初の 1 件**から取る（どの行にも同じ値が入っている前提）。
 * ★ ソースが 0 件なら何も作らない ── 中身の無いものを 1 つ置いても、
 *   受け取った側には「空のメモが生まれた」としか見えない。
 */
export function applyMappingRule(
  sources: unknown[],
  rule: MappingRule
): Record<string, unknown>[] {
  const inner = rule.mappings.filter(intoArray);
  const outer = rule.mappings.filter((m) => !intoArray(m));

  if (inner.length === 0) {
    return sources.map((src) => {
      const one: Record<string, unknown> = {};
      fill(one, src, outer, (m) => stringToPath(m.targetPath));
      return one;
    });
  }

  if (sources.length === 0) return [];

  const result: Record<string, unknown> = {};
  fill(result, sources[0], outer, (m) => stringToPath(m.targetPath));
  // 何番目の要素かは、ここで決まる ── ソースの順番が、そのまま並びの順番
  sources.forEach((src, i) =>
    fill(result, src, inner, (m) => atIndex(stringToPath(m.targetPath), i)),
  );
  return [result];
}
