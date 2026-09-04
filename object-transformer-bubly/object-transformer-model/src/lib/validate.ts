/**
 * マッピングの妥当性チェック
 */

import type { SchemaProperty } from "./DomainSchema.js";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * ソースキーとターゲットプロパティのマッピングが妥当かチェック
 */
export function validateMapping(
  sourceKey: string,
  targetProperty: SchemaProperty,
  sampleValue?: string
): ValidationResult {
  const errors: string[] = [];

  if (!sourceKey) {
    errors.push("ソースキーが未指定です");
  }

  if (sampleValue !== undefined && sampleValue !== "") {
    switch (targetProperty.type) {
      case "number": {
        const n = Number(sampleValue);
        if (isNaN(n)) {
          errors.push(
            `"${sampleValue}" は数値に変換できません（${targetProperty.label ?? targetProperty.name}）`
          );
        }
        break;
      }
      case "boolean":
        // 任意の文字列をboolに変換可能なので警告レベル
        break;
      case "enum":
        if (
          targetProperty.enumValues &&
          !targetProperty.enumValues.includes(sampleValue)
        ) {
          errors.push(
            `"${sampleValue}" は許可された値（${targetProperty.enumValues.join(", ")}）に含まれません`
          );
        }
        break;
      case "string":
        // 文字列はなんでもOK
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
