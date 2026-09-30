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

/**
 * **役** ── その項目が何にあたるかを、項目の名前とは別に名乗る。
 *
 * > 綴りには頼らない。
 *
 * 受け取る側が `durationMin` という名前を探しにいくと、相手が
 * `estimateMinutes` だったときに**黙って繋がらない**（繋がらなかったことが
 * 誰にも見えないのがいちばん悪い）。役を名乗ってもらえば、名前が何であっても引ける。
 *
 * ★ **足してよいのは、2 つ以上のバブリが独立にその役を要ったとき。**
 *   1 つのバブリのためだけの役は、役ではなく**そのバブリの中の事情**。
 *   これが無いと、バブリが増えるたびに共通語彙が膨らんで、誰も全体を言えなくなる。
 * ★ 渡すデータの意味も、口（できることを差し出す穴）の契約も、**同じこの語彙で書く**
 *   ── 仕組みを 2 つ作らない（`docs/bubly-composition.md`）。
 */
export type FieldRole =
  /** そのものを一言で呼ぶ名前 */
  | "title"
  /** かかる長さ（分） */
  | "duration"
  /** 費用（円） */
  | "money"
  /** 場所。緯度・経度そのものか、場所を持つものの id */
  | "place"
  /** 緯度 */
  | "latitude"
  /** 経度 */
  | "longitude"
  /**
   * **いつの話か。** `MM-DD`（`05-17`）か、`#N`（何日目か。`#1` は初日）。
   *
   * ★ 年を持たないのは、**書く人が年を書かない**から。メモに「5/17」としか
   *   書いていないのに年を埋めると、埋めた年は誰も言っていない数になる。
   *   年を知っているのは受け取る側（旅程）なので、そちらで合わせる。
   * ★ 「何日目」を別の役にしないのは、**同じ問い（いつ）への別の答え方**だから。
   *   役を 2 つに割ると、受け取る側が両方見に行かないといけない。
   */
  | "date"
  /**
   * **その日の何時からか**（0 時からの分）。分からないときは負の数。
   *
   * ★ 「いつ（`date`）」と別にしたのは、**片方だけ分かることが多い**から
   *   ── 「5/17 に行く」は言えても何時かは決めていない、はふつうに起きる。
   *   1 つの役にまとめると、片方しか無いものを渡せなくなる。
   */
  | "time"
  /**
   * **そのものを開く先**（url）。
   *
   * ★ 渡されたものの中の 1 件を、受け取った側が**泡として開ける**ようにするために要る。
   *   旅程は「入らなかったものを隣に置く」ので、置くには開ける先が要る。
   *   地図も同じ（ピンを押して開く）。2 つ以上が独立に要ったので役にした。
   */
  | "address"
  /**
   * **どの仲間か** ── 書いた人が付けた区切りの名前（メモの見出しなど）。
   *
   * ★ 「同じ所に書いてあった」は、**書いた人が自分で作った関係**。
   *   機械が推し量った関係より確かなので、これを置き場所に使う
   *   （旅程の本計画づくりでは、仲間ごとに違う向きへ散る）。
   */
  | "group";

export const FIELD_ROLES: readonly FieldRole[] = [
  "title",
  "duration",
  "money",
  "place",
  "latitude",
  "longitude",
  "date",
  "time",
  "address",
  "group",
];

export type SchemaField = {
  readonly name: string;
  readonly shape: SchemaShape;
  readonly required: boolean;
  readonly label?: string;
  /**
   * この項目が何にあたるか（{@link FieldRole}）。名乗らなくてもよい ──
   * **受け取る側が要求してよいのは題名だけ**で、あとは名乗っていれば
   * そのぶんうまくやる、名乗っていなければ既定になる、という決まりにしてある。
   */
  readonly role?: FieldRole;
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
