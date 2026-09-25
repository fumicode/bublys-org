/**
 * **このバブリの定義** ── 名前・見せ方・**大元の url から何を開くか**を書く 1 か所。
 *
 * ここはスタンドアロンの束（`vite.config.bubly.ts`）の入口でもある。OS からは
 * `{origin}/bubly.js` として読み込まれ、`registerBubly` で登録される。
 *
 * ★ `initialBubbleUrls` が「`users-bubly` を開いたら何が開くか」。
 *   OS のランチャーはこの大元の url だけを持ち、実際に開く泡はここから引く
 *   ── 呼び出す側に `users` と書かせない（書かせると、開くものを変えたときに嘘になる）。
 */
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import PersonIcon from "@mui/icons-material/Person";

import { usersBubbleRoutes } from "@bublys-org/users-libs";

const UsersBubly: Bubly = {
  name: "users",
  version: "0.0.1",
  label: "ユーザー",
  icon: React.createElement(PersonIcon, { color: "action" }),
  initialBubbleUrls: ["users"],
  backdropColor: "hsl(190, 50%, 22%)",

  register(context) {
    context.registerBubbleRoutes(usersBubbleRoutes);
  },
};

registerBubly(UsersBubly);

export default UsersBubly;
