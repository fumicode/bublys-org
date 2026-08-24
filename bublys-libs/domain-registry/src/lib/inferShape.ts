/**
 * 任意の値から SchemaShape を推論する。
 *
 * ドロップされたインスタンスや CSV 行のように「スキーマ登録がない値」でも
 * 構造を再現できるようにするためのフォールバック。
 */

import {
  arrayShape,
  objectShape,
  primitiveShape,
  type SchemaShape,
  type SchemaField,
} from "./SchemaShape.js";

/** 値そのものから shape を推論する */
export function inferShape(value: unknown): SchemaShape {
  if (typeof value === "string") return primitiveShape("string");
  if (typeof value === "number") return primitiveShape("number");
  if (typeof value === "boolean") return primitiveShape("boolean");
  if (Array.isArray(value)) {
    if (value.length === 0) return arrayShape(primitiveShape("string"));
    return arrayShape(inferShape(value[0]));
  }
  if (value !== null && typeof value === "object") {
    const fields: SchemaField[] = Object.entries(value as Record<string, unknown>).map(
      ([name, v]) => ({
        name,
        shape: inferShape(v),
        required: v !== null && v !== undefined,
      })
    );
    return objectShape(fields);
  }
  // null / undefined / それ以外は「値がないが将来入るかも」= string 扱い
  return primitiveShape("string");
}

/**
 * ドメインインスタンス（state パターン）に対応した推論。
 * `state` プロパティがあれば中身を、なければ値自体を推論する。
 */
export function inferShapeFromInstance(value: unknown): SchemaShape {
  if (value !== null && typeof value === "object" && "state" in value) {
    return inferShape((value as { state: unknown }).state);
  }
  return inferShape(value);
}
