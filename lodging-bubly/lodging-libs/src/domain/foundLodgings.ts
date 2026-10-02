/**
 * **探した結果そのもの** ── 1 軒ずつではなく、**当たったものぜんぶを 1 つのものとして**
 * 掴めるようにするための形。地点の側（`foundSpots.ts`）と同じ考えで揃えてある。
 *
 * > 探した結果を掴んで地図へ落とせば、当たったものが全部ピンになる。
 *
 * ★ **中身を持ち歩かない。持つのは探し方だけ。** 荷物に詰めて運ぶと、落とした先が
 *   持っているのは「あのときの写し」になる ── 宿の名前を直してもピンが古いまま残る。
 * ★ 探し方は id の中に畳む。運べる荷物は url 1 本だけなので、探し方が url に
 *   入っていないと、落とした先で何も分からない。
 * ★ 出すのは**当たったものぜんぶ**で、いま並びに出ている 40 軒ではない。
 */
import {
  arrayShape,
  objectRefShape,
  objectShape,
  primitiveShape,
  type SchemaShape,
} from "@bublys-org/domain-registry/schema";
import type { LodgingPlain } from "./Lodging.domain.js";
import type { LodgingQuery } from "./lodgingSearch.js";

/** 掴んで運ぶときの型の名前 */
export const FOUND_LODGINGS_TYPE = "FoundLodgings";

/** 開く先 */
export const foundLodgingsUrl = (id: string): string => `found-lodgings/${id}`;

/** 探した結果の中身の形（`collectPlaces` がこの形に沿って中を歩く） */
export const FOUND_LODGINGS_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "title", role: "title", shape: primitiveShape("string"), required: true, label: "名前" },
  {
    name: "items",
    required: true,
    label: "当たったもの",
    shape: arrayShape(
      objectShape([
        { name: "title", role: "title", shape: primitiveShape("string"), required: true, label: "名前" },
        { name: "place", role: "place", shape: objectRefShape(), required: true, label: "宿" },
      ]),
    ),
  },
]);

export type FoundLodgingsPlain = {
  id: string;
  title: string;
  items: { title: string; place: { type: string; id: string } }[];
};

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (id: string): string => {
  const b64 = id.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
};

/** 探し方を id に畳む（url に入れられる字だけで書く ── 区分もエリアも日本語なので） */
export const encodeLodgingQuery = (query: LodgingQuery): string =>
  toBase64Url(JSON.stringify(query));

/** id から探し方を戻す。読めなければ `undefined` */
export const decodeLodgingQuery = (id: string): LodgingQuery | undefined => {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(id));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return parsed as LodgingQuery;
  } catch {
    return undefined;
  }
};

/** 探し方を人の言葉にする */
export const describeLodgingQuery = (query: LodgingQuery): string => {
  const parts = [query.text?.trim(), query.kind, query.area, query.city, query.region].filter(Boolean);
  return parts.length === 0 ? "ぜんぶ" : parts.join("・");
};

/** 当たったものを、歩ける形にして返す */
export const foundLodgingsPlain = (
  id: string,
  query: LodgingQuery,
  matches: readonly LodgingPlain[],
): FoundLodgingsPlain => ({
  id,
  title: `${describeLodgingQuery(query)}（${matches.length} 軒）`,
  items: matches.map((l) => ({ title: l.name, place: { type: "Lodging", id: l.id } })),
});
