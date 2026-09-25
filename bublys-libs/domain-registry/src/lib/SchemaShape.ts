/**
 * SchemaShape — 値の「形」を再帰的に表現する純粋な型。
 *
 * ドメインオブジェクトの構造をバブリ間で共有するための共通言語。
 * バブル・UI・Redux などランタイム依存はなく、型と純粋関数だけで完結する。
 */

export type PrimitiveKind = "string" | "number" | "boolean";

/**
 * 値の形。
 *
 * ★ **`object` と `record` は別もの。**
 *   `object` は「項目の名前が決まっているもの」（`{id, name}`）。
 *   `record` は「**名前が決まっていない**もの」── メモの本文 `Record<blockId, MemoBlock>` や
 *   CSV のセル `Record<columnId, string>` のように、**キーが実行時にしか無い**辞書。
 *   前は record の語彙が無かったので、こういう項目は**申告そのものを諦めて**いた
 *   （メモは id と行の並びしか名乗れず、本文が変換エディタから見えなかった）。
 */
export type SchemaShape =
  | { readonly kind: "primitive"; readonly primitive: PrimitiveKind }
  | { readonly kind: "enum"; readonly options: readonly string[] }
  | { readonly kind: "object"; readonly fields: readonly SchemaField[] }
  | { readonly kind: "array"; readonly item: SchemaShape }
  | { readonly kind: "record"; readonly value: SchemaShape };

export type SchemaField = {
  readonly name: string;
  readonly shape: SchemaShape;
  readonly required: boolean;
  readonly label?: string;
};

/** シンプルなビルダー（読みやすさのため） */
export const primitiveShape = (primitive: PrimitiveKind): SchemaShape => ({
  kind: "primitive",
  primitive,
});

export const enumShape = (options: readonly string[]): SchemaShape => ({
  kind: "enum",
  options,
});

export const objectShape = (fields: readonly SchemaField[]): SchemaShape => ({
  kind: "object",
  fields,
});

export const arrayShape = (item: SchemaShape): SchemaShape => ({
  kind: "array",
  item,
});

/**
 * キーが決まっていない辞書。`value` は**どの項目にも共通の**中身の形。
 * キーそのものは形を持たない（いつも文字列）ので、申告するのは中身だけ。
 */
export const recordShape = (value: SchemaShape): SchemaShape => ({
  kind: "record",
  value,
});

/** 表示用のシンプルな型名 */
export const shapeKindLabel = (shape: SchemaShape): string => {
  switch (shape.kind) {
    case "primitive":
      return shape.primitive;
    case "enum":
      return "enum";
    case "object":
      return "object";
    case "array":
      return `array<${shapeKindLabel(shape.item)}>`;
    case "record":
      return `record<${shapeKindLabel(shape.value)}>`;
  }
};

/** リーフ（プリミティブ or enum）かどうか */
export const isLeafShape = (shape: SchemaShape): boolean =>
  shape.kind === "primitive" || shape.kind === "enum";

/**
 * オブジェクト shape のリーフを path 付きで列挙する。
 * ネストしたオブジェクトは再帰的に平坦化。配列は要素まで潜らず配列自体をリーフ扱いにする。
 *
 * ★ **record も潜らない**（配列と同じ）。中の項目には**名前が無い**ので、
 *   `blocks.<なにか>.content` という道が書けない ── 道が書けないものは繋ぎ先にできないので、
 *   辞書まるごとで 1 つの繋ぎ先として出す。
 */
export function walkLeafFields(
  shape: SchemaShape,
  prefix: readonly string[] = []
): { readonly path: readonly string[]; readonly field: SchemaField }[] {
  if (shape.kind !== "object") return [];
  const result: { path: readonly string[]; field: SchemaField }[] = [];
  for (const field of shape.fields) {
    if (field.shape.kind === "object") {
      result.push(...walkLeafFields(field.shape, [...prefix, field.name]));
    } else {
      result.push({ path: [...prefix, field.name], field });
    }
  }
  return result;
}

/** path を dot-notation 文字列に */
export const pathToString = (path: readonly string[]): string => path.join(".");

/** dot-notation 文字列を path に */
export const stringToPath = (s: string): string[] => (s === "" ? [] : s.split("."));

/** shape 内の指定 path のフィールドを引く */
export function getFieldAtPath(
  shape: SchemaShape,
  path: readonly string[]
): SchemaField | undefined {
  if (path.length === 0) return undefined;
  if (shape.kind !== "object") return undefined;
  const [head, ...rest] = path;
  const field = shape.fields.find((f) => f.name === head);
  if (!field) return undefined;
  if (rest.length === 0) return field;
  return getFieldAtPath(field.shape, rest);
}
