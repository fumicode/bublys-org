/**
 * マッピングの妥当性チェック
 */

import type { SchemaField } from "@bublys-org/domain-registry/schema";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * ソース path とターゲットフィールドのマッピングが妥当かチェック
 */
export function validateMapping(
  sourcePath: string,
  targetField: SchemaField,
  sampleValue?: unknown
): ValidationResult {
  const errors: string[] = [];

  if (!sourcePath) {
    errors.push("ソース path が未指定です");
  }

  if (sampleValue === undefined || sampleValue === "") {
    return { valid: errors.length === 0, errors };
  }

  const sampleStr = typeof sampleValue === "string" ? sampleValue : String(sampleValue);
  const label = targetField.label ?? targetField.name;

  switch (targetField.shape.kind) {
    case "primitive": {
      switch (targetField.shape.primitive) {
        case "number": {
          const n = Number(sampleStr);
          if (isNaN(n)) {
            errors.push(`"${sampleStr}" は数値に変換できません（${label}）`);
          }
          break;
        }
        case "boolean":
          // 任意の値を真偽に変換可能なので警告なし
          break;
        case "string":
          break;
      }
      break;
    }
    case "enum":
      if (!targetField.shape.options.includes(sampleStr)) {
        errors.push(
          `"${sampleStr}" は許可された値（${targetField.shape.options.join(", ")}）に含まれません`
        );
      }
      break;
    case "object":
    case "array":
      // 複合型はここでは検証しない
      break;
  }

  return { valid: errors.length === 0, errors };
}
