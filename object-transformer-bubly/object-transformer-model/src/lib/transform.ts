/**
 * PlaneObject[] × MappingRule → Record<string, unknown>[] の変換実行ロジック
 */

import type { MappingRule, ValueTransform } from "./MappingRule.js";

/** PlaneObject型（csv-importer-modelから再export不要な最小定義） */
export type PlaneObjectLike = {
  id: string;
  name: string;
  [key: string]: string;
};

/**
 * 単一値の変換
 */
export function applyTransform(
  value: string,
  transform: ValueTransform
): unknown {
  switch (transform.type) {
    case "identity":
      return value;
    case "toNumber": {
      const n = Number(value);
      return isNaN(n) ? value : n;
    }
    case "toBoolean":
      return transform.trueValues.includes(value);
    case "dictionary":
      return transform.map[value] ?? value;
  }
}

/**
 * PlaneObject配列をMappingRuleに従って変換する
 */
export function applyMappingRule(
  planeObjects: PlaneObjectLike[],
  rule: MappingRule
): Record<string, unknown>[] {
  return planeObjects.map((obj) => {
    const result: Record<string, unknown> = {};
    for (const mapping of rule.mappings) {
      const rawValue = obj[mapping.sourceKey];
      if (rawValue !== undefined) {
        result[mapping.targetProperty] = applyTransform(
          rawValue,
          mapping.transform
        );
      }
    }
    return result;
  });
}
