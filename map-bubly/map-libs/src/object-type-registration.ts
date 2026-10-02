/**
 * map バブリが自分で名乗る ── 型（アイコン）と、その中身の形（スキーマ）と、
 * 「掴んで運ぶときの型」「どこに開くか」。
 *
 * ★ **`registerObjectUrl` を名乗るのが要**。これがあると、ほかのバブリは
 *   `<ObjectView object={spot}>` と書くだけで「開く先は `spots/<id>`」に辿り着ける
 *   ── 行き先を使う側が手書きすると、url を変えたときに追随できない所が残る。
 */
import {
  registerObjectType,
  registerObjectBubble,
  registerObjectUrl,
  registerObjectIdentity,
  registerObjectResolver,
} from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import PlaceIcon from "@mui/icons-material/Place";
import SearchIcon from "@mui/icons-material/Search";
import React from "react";
import { SPOT_SHAPE, Spot_地点 } from "./domain/Spot.domain.js";
import { selectSpotPlainById, selectSpotPlains } from "./slice/map-slice.js";
import {
  FOUND_SPOTS_SHAPE,
  FOUND_SPOTS_TYPE,
  decodeSpotQuery,
  foundSpotsPlain,
  foundSpotsUrl,
} from "./domain/foundSpots.js";
import { SPOT_SEARCH_LIMIT, searchSpots } from "./domain/spotSearch.js";

registerObjectType("Spot", React.createElement(PlaceIcon, { fontSize: "small" }));
registerObjectUrl("Spot", (id) => `spots/${id}`);
registerObjectBubble("Spot", { openingPosition: "bubble-side-right" });
/** 見分け方 ── これがあると `<ObjectView object={spot}>` だけで型と ID が解ける */
registerObjectIdentity("Spot", {
  class: Spot_地点,
  getId: (obj) => (obj as Spot_地点).id,
});

/**
 * **中身を訊かれたら答える。**
 *
 * ほかのバブリは `map-libs` を import せずに、型名と id だけでここへ辿り着く
 * （`resolveObjectPlain("Spot", id, state)`）── 旅程が地図を名指ししなくて済む唯一の道。
 *
 * ★ 状態は引数で受け取る。呼ぶ側はセレクタの中で渡すので、**地点の名前を直せば
 *   訊いた側の表示もその場で変わる**（渡した瞬間の写しにならない）。
 */
registerObjectResolver("Spot", (id, state) =>
  selectSpotPlainById(state as Parameters<typeof selectSpotPlainById>[0], id),
);

registerSchema("Spot", SPOT_SHAPE);

/**
 * **探した結果そのもの**も名乗る ── 掴んで地図へ落とせるように。
 *
 * ★ 中身は**訊かれたときに数え直す**。荷物に詰めて運ばないので、
 *   地点の名前を直せば、落としたピンの名前もその場で変わる。
 * ★ 出すのは当たったものぜんぶ（上限を外して数える）。並びに出ている 40 件ではない
 *   ── 人が「探した結果」と言うときに指しているのは、頁をめくった先も含めた全部。
 */
registerObjectType(FOUND_SPOTS_TYPE, React.createElement(SearchIcon, { fontSize: "small" }));
registerObjectUrl(FOUND_SPOTS_TYPE, foundSpotsUrl);
registerObjectBubble(FOUND_SPOTS_TYPE, { openingPosition: "bubble-side-right" });

registerObjectResolver(FOUND_SPOTS_TYPE, (id, state) => {
  const query = decodeSpotQuery(id);
  if (!query) return undefined;
  const all = selectSpotPlains(state as Parameters<typeof selectSpotPlains>[0]);
  const found = searchSpots(all, query, Number.MAX_SAFE_INTEGER);
  return foundSpotsPlain(id, query, found.matches);
});

registerSchema(FOUND_SPOTS_TYPE, FOUND_SPOTS_SHAPE);

/** 一度に出す数は、探す帯と結果の札で同じものを見る */
export { SPOT_SEARCH_LIMIT };
