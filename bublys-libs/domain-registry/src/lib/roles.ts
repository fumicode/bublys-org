/**
 * **役から値を引く。**
 *
 * 受け取る側は、来たものが何なのかを知らない。知らないまま使うための道具がここ。
 * 「時間の役を名乗っている項目はどれか」を形（{@link SchemaShape}）に訊いて、
 * その名前で中身から値を取り出す。
 *
 * ★ **1 つの値から読むときは、いちばん外側の項目だけを見る**（`readRole` ほか）。
 *   奥まで探しにいくと、同じ役が何か所にも出てきたときにどれが本物か言えなくなる
 *   （旅程の「予定 1 件の金額」と「旅程ぜんぶの金額」など）。
 * ★ 例外は {@link collectPlaces} ── あれは「1 つの値を読む」のではなく
 *   **中に居るものを全部数え上げる**ので、奥まで歩く。数え上げなら、
 *   何か所にあっても「全部」で正しい。
 */
import type { ObjectRef } from "@bublys-org/object-types";
import type { FieldRole, SchemaField, SchemaShape } from "./SchemaShape.js";
import { objectShape, primitiveShape } from "./SchemaShape.js";

/** その役を名乗っている項目。無ければ `undefined`。同じ役が 2 つあれば先に書いたほう */
export const getRoleField = (
  shape: SchemaShape | undefined,
  role: FieldRole,
): SchemaField | undefined => {
  if (!shape || shape.kind !== "object") return undefined;
  return shape.fields.find((f) => f.role === role);
};

/** その役の値。役を名乗っていない・値が無いなら `undefined` */
export const readRole = (
  shape: SchemaShape | undefined,
  value: unknown,
  role: FieldRole,
): unknown => {
  const field = getRoleField(shape, role);
  if (!field) return undefined;
  if (value === null || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[field.name];
};

/**
 * 役の値を**文字**として読む。
 * 数が来ても文字にする ── 題名に番号を使っている型もあるので、そこで落とさない。
 */
export const readRoleText = (
  shape: SchemaShape | undefined,
  value: unknown,
  role: FieldRole,
): string | undefined => {
  const v = readRole(shape, value, role);
  if (typeof v === "string") return v || undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
};

/**
 * 役の値を**数**として読む。
 *
 * ★ 読めない値は `undefined` を返す ── **黙って 0 にしない。**
 *   0 は「無料」「かからない」という意味のある答えなので、
 *   「名乗っていない」と混ぜると、受け取った側が嘘の合計を出す。
 */
export const readRoleNumber = (
  shape: SchemaShape | undefined,
  value: unknown,
  role: FieldRole,
): number | undefined => {
  const v = readRole(shape, value, role);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/** その形が、この役を名乗っているか */
export const hasRole = (shape: SchemaShape | undefined, role: FieldRole): boolean =>
  getRoleField(shape, role) !== undefined;

/**
 * **緯度経度を名乗っているか、そこに行けるか。**
 *
 * 場所の名乗り方は 2 通りある:
 *   - `latitude` / `longitude` を直に名乗る（その場で地図に出せる）
 *   - `place` で「場所を持つものの id」を名乗る（その id をたどれば出せる）
 *
 * 地図はどちらでも受け取れる必要があるので、判定をここ 1 か所に置く。
 */
export const readLatLng = (
  shape: SchemaShape | undefined,
  value: unknown,
): { lat: number; lng: number } | undefined => {
  const lat = readRoleNumber(shape, value, "latitude");
  const lng = readRoleNumber(shape, value, "longitude");
  if (lat === undefined || lng === undefined) return undefined;
  return { lat, lng };
};

/**
 * **指の形**（`{ type, id }`）。`place` の役を名乗る項目はこの形にする。
 *
 * ★ id だけの文字列でも `place` を名乗れてしまうが、それだと**誰に訊けばよいか
 *   分からない** ── 使う側が「たぶん Spot だろう」と決め打ちすることになる。
 *   形をここに 1 つ置いて、名乗る側がこれを使う。
 */
export const objectRefShape = (): SchemaShape =>
  objectShape([
    { name: "type", shape: primitiveShape("string"), required: true, label: "型" },
    { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  ]);

/** `place` の役の値を、指として読む。形が違えば `undefined` */
export const readPlaceRef = (
  shape: SchemaShape | undefined,
  value: unknown,
): ObjectRef | undefined => {
  const v = readRole(shape, value, "place");
  if (v === null || typeof v !== "object") return undefined;
  const { type, id } = v as { type?: unknown; id?: unknown };
  if (typeof type !== "string" || typeof id !== "string" || !type || !id) return undefined;
  return { type, id };
};

/** 歩いて見つけた「場所を名乗るもの」1 つ */
export type FoundPlace = {
  /** 題名（名乗っていれば） */
  readonly title?: string;
  /** 緯度経度を直に名乗っていれば、それ */
  readonly latLng?: { readonly lat: number; readonly lng: number };
  /** 場所を指しているなら、その指 */
  readonly ref?: ObjectRef;
};

/**
 * **渡されたものの中を歩いて、場所を名乗っているものを順に拾う。**
 *
 * > 地図は、場所を名乗っているものなら何でも描く。
 *
 * 地点 1 つを渡されれば 1 つ、旅程の 1 日を渡されればその日の立ち寄り先が
 * **書いてある順に**出てくる ── 地図はそれを繋げば道になる。
 * 「並び」という新しい役を足さずに済むのは、**書いてある順がそのまま順**だから。
 *
 * ★ 入れ子は形（`shape`）に沿って歩く。形を持たない所（辞書の中など）へは入らない
 *   ── 名乗っていない所を憶測で読むと、関係ないものまでピンになる。
 */
export const collectPlaces = (
  shape: SchemaShape | undefined,
  value: unknown,
): FoundPlace[] => {
  const found: FoundPlace[] = [];
  walk(shape, value, found);
  return found;
};

const walk = (shape: SchemaShape | undefined, value: unknown, out: FoundPlace[]): void => {
  if (!shape) return;

  if (shape.kind === "array") {
    if (!Array.isArray(value)) return;
    for (const v of value) walk(shape.item, v, out);
    return;
  }

  if (shape.kind !== "object") return;
  if (value === null || typeof value !== "object") return;

  // この段そのものが場所を名乗っているか
  const latLng = readLatLng(shape, value);
  const ref = readPlaceRef(shape, value);
  if (latLng || ref) {
    out.push({ title: readRoleText(shape, value, "title"), latLng, ref });
  }

  // 名乗っていない段でも、中に名乗っている段があるかもしれない（旅程 → 日 → 予定）
  const record = value as Record<string, unknown>;
  for (const field of shape.fields) {
    if (field.shape.kind === "object" || field.shape.kind === "array") {
      // 指そのもの（`{type,id}`）の中へは入らない ── もう読んである
      if (field.role === "place") continue;
      walk(field.shape, record[field.name], out);
    }
  }
};
