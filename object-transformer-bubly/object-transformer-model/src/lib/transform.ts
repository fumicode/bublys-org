/**
 * ソースオブジェクト[] × MappingRule → ターゲットオブジェクト[] の変換実行ロジック
 *
 * path（dot-notation）で source から値を取り、target の同じ path に置く。
 * 途中のオブジェクトは必要に応じて自動生成される。
 */

import { stringToPath } from "@bublys-org/domain-registry/schema";
import type { MappingRule, ValueTransform } from "./MappingRule.js";

/** 過去互換のための型（csv-importer の PlaneObject が満たす形） */
export type PlaneObjectLike = Record<string, unknown> & {
  id: string;
  name: string;
};

/** path の位置の値を取得 */
export function getAtPath(obj: unknown, path: readonly string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** path の位置に値を置く。途中のオブジェクトが無ければ作る */
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
      cur[key] = {};
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

/** ソース配列を MappingRule で変換して、ネストしたオブジェクト配列を返す */
export function applyMappingRule(
  sources: unknown[],
  rule: MappingRule
): Record<string, unknown>[] {
  return sources.map((src) => {
    const result: Record<string, unknown> = {};
    for (const mapping of rule.mappings) {
      const raw = getAtPath(src, stringToPath(mapping.sourcePath));
      if (raw !== undefined) {
        setAtPath(
          result,
          stringToPath(mapping.targetPath),
          applyTransform(raw, mapping.transform)
        );
      }
    }
    return result;
  });
}
