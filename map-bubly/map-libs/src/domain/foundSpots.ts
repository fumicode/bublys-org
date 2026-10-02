/**
 * **探した結果そのもの** ── 1 件ずつではなく、**当たったものぜんぶを 1 つのものとして**
 * 掴めるようにするための形。
 *
 * > 探した結果を掴んで地図へ落とせば、当たったものが全部ピンになる。
 *
 * ★ **中身を持ち歩かない。持つのは探し方だけ。** 243 件の地点を荷物に詰めて運ぶと、
 *   落とした先が持っているのは「あのときの写し」になる ── 元の地点の名前を直しても
 *   ピンの名前が古いまま残る。だから持つのは**探し方**（query）だけにして、
 *   中身は落ちた先で持ち主に訊き直す（`registerObjectResolver`）。
 * ★ 探し方は id の中に畳む（`encodeSpotQuery`）。掴んで運ぶ荷物に載るのは url 1 本
 *   だけなので、探し方が url の中に入っていないと、落とした先で何も分からない。
 * ★ 出すのは**当たったものぜんぶ**（`matches`）で、いま並びに出ている 40 件ではない。
 *   「探した結果」と言ったときに人が指しているのは、頁をめくった先も含めた全部。
 */
import {
  arrayShape,
  objectRefShape,
  objectShape,
  primitiveShape,
  type SchemaShape,
} from "@bublys-org/domain-registry/schema";
import type { SpotPlain } from "./Spot.domain.js";
import type { SpotQuery } from "./spotSearch.js";

/** 掴んで運ぶときの型の名前 */
export const FOUND_SPOTS_TYPE = "FoundSpots";

/** 開く先 */
export const foundSpotsUrl = (id: string): string => `found-spots/${id}`;

/**
 * 探した結果の中身の形。
 *
 * ★ `collectPlaces` はこの形に沿って中を歩き、`place` の役を名乗る所を順に拾う
 *   ── 旅程の「日 → 予定 → 立ち寄り先」と同じ歩き方なので、地図は何も足さずに描ける。
 */
export const FOUND_SPOTS_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "title", role: "title", shape: primitiveShape("string"), required: true, label: "名前" },
  {
    name: "items",
    required: true,
    label: "当たったもの",
    shape: arrayShape(
      objectShape([
        { name: "title", role: "title", shape: primitiveShape("string"), required: true, label: "名前" },
        { name: "place", role: "place", shape: objectRefShape(), required: true, label: "地点" },
      ]),
    ),
  },
]);

export type FoundSpotsPlain = {
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

/**
 * 探し方を id に畳む。
 *
 * ★ **url に入れられる字だけで書く**（base64url）。目印も市町村も日本語なので、
 *   そのまま url に置くと、落とした先で切れたり化けたりする。
 */
export const encodeSpotQuery = (query: SpotQuery): string => toBase64Url(JSON.stringify(query));

/** id から探し方を戻す。読めなければ `undefined`（古い url を掴んだまま落とした等） */
export const decodeSpotQuery = (id: string): SpotQuery | undefined => {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(id));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return parsed as SpotQuery;
  } catch {
    return undefined;
  }
};

/** 探し方を人の言葉にする（掴む札と、落ちたピンの題名に出る） */
export const describeSpotQuery = (query: SpotQuery): string => {
  const parts = [
    query.text?.trim(),
    query.city,
    query.region,
    ...(query.tags ?? []),
  ].filter(Boolean);
  return parts.length === 0 ? "ぜんぶ" : parts.join("・");
};

/** 当たったものを、歩ける形にして返す */
export const foundSpotsPlain = (
  id: string,
  query: SpotQuery,
  matches: readonly SpotPlain[],
): FoundSpotsPlain => ({
  id,
  title: `${describeSpotQuery(query)}（${matches.length} 件）`,
  items: matches.map((s) => ({ title: s.name, place: { type: "Spot", id: s.id } })),
});
