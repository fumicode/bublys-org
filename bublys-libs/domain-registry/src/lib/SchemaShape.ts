/**
 * SchemaShape — 値の「形」を再帰的に表現する純粋な型。
 *
 * ドメインオブジェクトの構造をバブリ間で共有するための共通言語。
 * バブル・UI・Redux などランタイム依存はなく、型と純粋関数だけで完結する。
 */

export type PrimitiveKind = "string" | "number" | "boolean";

export type SchemaShape =
  | { readonly kind: "primitive"; readonly primitive: PrimitiveKind }
  | { readonly kind: "enum"; readonly options: readonly string[] }
  | { readonly kind: "object"; readonly fields: readonly SchemaField[] }
  | { readonly kind: "array"; readonly item: SchemaShape };

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
  }
};

/** リーフ（プリミティブ or enum）かどうか */
export const isLeafShape = (shape: SchemaShape): boolean =>
  shape.kind === "primitive" || shape.kind === "enum";

/**
 * オブジェクト shape のリーフを path 付きで列挙する。
 * ネストしたオブジェクトは再帰的に平坦化。配列は要素まで潜らず配列自体をリーフ扱いにする。
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
