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

/**
 * **並びの中の一つ**を指す段。`blocks[]` のように並びの名前のうしろに付く。
 *
 * > **並びには番号がある。だから中へ道が引ける。**
 *
 * 辞書（`record`）との違いはここ ── 辞書の中の一つ一つには名前が無いので、
 * 指しようがない（`walkLeafFields` の註）。並びは「何番目」で指せるから、
 * 中の項目まで道が続く。何番目かは書かない：読むときは最初の一つ、
 * 書くときは新しい一つ、と**する側が決める**（`transform.ts`）。
 */
export const ELEMENT_SUFFIX = "[]";

/** 並びの中を指す段を作る（`blocks` → `blocks[]`） */
export const elementStep = (name: string): string => `${name}${ELEMENT_SUFFIX}`;

/** その段は並びの中を指しているか */
export const isElementStep = (step: string): boolean => step.endsWith(ELEMENT_SUFFIX);

/** 並びの中を指す段から、並びの名前を取り出す（`blocks[]` → `blocks`） */
export const arrayNameOf = (step: string): string =>
  isElementStep(step) ? step.slice(0, -ELEMENT_SUFFIX.length) : step;

/**
 * その並びの中へ道が引けるか。
 * **中身が項目を持っているとき（`object`）だけ** ── 文字列の並びは中に項目が無いので、
 * 引ける道は「並びそのもの」しかない。
 */
const opensInto = (shape: SchemaShape): boolean =>
  shape.kind === "array" && shape.item.kind === "object";

/** リーフ（プリミティブ or enum）かどうか */
export const isLeafShape = (shape: SchemaShape): boolean =>
  shape.kind === "primitive" || shape.kind === "enum";

/**
 * オブジェクト shape のリーフを path 付きで列挙する。
 * ネストしたオブジェクトは再帰的に平坦化。配列は要素まで潜らず配列自体をリーフ扱いにする。
 *
 * ★ **中身が項目を持つ並びは、中へ潜る**（`blocks[].content`）。並びには番号があるので
 *   「その中の一つ」を指せる ── 指せるものは繋ぎ先にできる。
 * ★ **文字列の並びと record は潜らない。** 前者は中に項目が無く、後者は中の一つ一つに
 *   **名前が無い**（`blocks.<なにか>.content` が書けない）。道が引けないものは
 *   まるごとで 1 つの繋ぎ先として出す。
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
    } else if (opensInto(field.shape) && field.shape.kind === "array") {
      // 並びの中へ（`blocks[].content`）。何番目かは書かない（`ELEMENT_SUFFIX` の註）
      result.push(...walkLeafFields(field.shape.item, [...prefix, elementStep(field.name)]));
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
  const field = shape.fields.find((f) => f.name === arrayNameOf(head));
  if (!field) return undefined;
  if (rest.length === 0) return field;
  // ★ 並びの中を指す段（`blocks[]`）なら、並びの中身へ続ける
  if (isElementStep(head)) {
    return field.shape.kind === "array"
      ? getFieldAtPath(field.shape.item, rest)
      : undefined;
  }
  return getFieldAtPath(field.shape, rest);
}
