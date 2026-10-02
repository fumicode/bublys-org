"use client";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH } from "@bublys-org/bubble-layout-feature";
import { LauncherBubble } from "../feature/LauncherBubble.js";
import { BublyLoaderBubble } from "../feature/BublyLoaderBubble.js";
import { BublyCard, BUBLY_CARD_HEIGHT } from "../feature/BublyCard.js";

/** ランチャーのバブルルート。OS 側が BubbleRouteRegistry に登録する */
export const launcherBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "launchers/:launcherId",
    type: "launcher",
    Component: LauncherBubble,
    bubbleOptions: { defaultSize: { width: 220, height: 360 } },
  },
];

/**
 * **バブリを追加する口**（と、読み込んだバブリ 1 つの札）。
 *
 * ★ もとは OS の中（`apps/bublys-os/app/launcher/`）にあった。別の空間からは
 *   import できないので、**旅の空間にだけ「バブリを追加」が置けなかった**。
 *   ランチャーの持ちものなので、ここへ移して両方が同じものを引く。
 * ★ ランチャー本体とは別の並びにしてある ── 「呼び出しを溜める泡」と
 *   「バブリを足す口」は別の話なので、要る空間だけが載せられるようにする。
 */
export const bublyLoaderBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^bubly-loader$/,
    type: "bubly-loader",
    /**
     * ★ **幅は一覧の箱に合わせる**（`LIST_BOX.width`）。中身は札 1 枚ずつのバブルなので、
     *   ほかの一覧と同じ幅でなければ札が切れる ── 286 だったころは、オリジンも
     *   「外す」も見切れていた。
     * ★ 丈は一覧の箱より少し高く ── 上に入力欄と行き先の案内が載るぶん。
     */
    Component: BublyLoaderBubble,
    bubbleOptions: { defaultSize: { width: LIST_BOX.width, height: LIST_BOX.height } },
  },
  {
    pattern: /^bublies\/[^/]+$/,
    type: "bubly-card",
    Component: ({ bubble }) => <BublyCard name={bubble.url.replace("bublies/", "")} />,
    bubbleOptions: { defaultSize: { width: LIST_CARD_WIDTH, height: BUBLY_CARD_HEIGHT } },
  },
];
