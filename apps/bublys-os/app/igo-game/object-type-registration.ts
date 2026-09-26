/**
 * 囲碁が自分で名乗る ── 型（アイコン）だけ。
 *
 * ★ **形（スキーマ）は申告しない。** 盤は `('black'|'white'|null)[][]` ── `enum` は
 *   文字列の並びしか持てないので **null が書けず**、書けたとしても変換エディタが
 *   繋ぐのはリーフ（`walkLeafFields`）なので、19×19 の盤も着手の履歴も繋ぎ先にならない。
 *   囲碁は変換されるものではなく**打たれるもの**なので、名乗るのは型までにしておく。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import React from "react";

registerObjectType(
  "IgoGame",
  React.createElement(SportsEsportsIcon, { fontSize: "small", sx: { color: "#dcb35c" } }),
);
