"use client";
/**
 * **旅の海** ── 器（`BubbleSea`）に、この空間の家具と、この空間で開けるものを載せたもの。
 *
 * OS（`BubblesUINext`）と同じ器・同じ家具を被る。違うのは 2 つだけ:
 *
 *   - **開けるもの**が旅の 4 つだけ（OS の標準バブリは 1 つも載らない）
 *   - **岸に貼る家具が 4 つ**（ランチャー・見え方の口・ポケット・世界線）。
 *     OS にある「他のデモへ行く口」「説明」「バブリを追加」は、この空間のものではない
 */
import { BubbleSea, type Home } from "@bublys-org/bubble-space-shell";
import {
  ROOT_SEA_SCOPE,
  WORLD_LINES_URL,
  POCKET_URL,
  SPACE_VIEW_URL,
  makeLauncherDock,
  makeSpaceViewDock,
  makePocketDock,
  makeWorldLinesDock,
  useEnsureLauncherEntity,
} from "@bublys-org/space-furniture";
import { useBubbleRoutes } from "@bublys-org/bubbles-ui";
import { BUBBLE_SKIN } from "@bublys-org/bubble-layout-feature";
// 開けるものをレジストリに登録するための副作用 import（一覧は下で hook から引く）
import "./routes";
import {
  ACTIVITIES_URL,
  DEFAULT_LAUNCHER_URLS,
  ITINERARY_URL,
  MAIN_LAUNCHER_ID,
  MAP_URL,
} from "./launchTargets";

const LAUNCHER_URL = `launchers/${MAIN_LAUNCHER_ID}`;

/**
 * **狭い画面での上の 1 列の並び順。** 左から詰める。
 * OS より 2 つ少ないので、世界線とポケットが 1 つずつ左へ寄る。
 */
const SEAT = { launcher: 0, worldLines: 1, pocket: 2 } as const;

/**
 * **定位置に居てほしいもの。** 居なくなったら、ここへ戻ってくる。
 * 岸に貼ってある間は閉じる口が無いので、消えるのは海へ出して閉じたときだけ。
 */
const HOMES: readonly Home[] = [
  makeLauncherDock(LAUNCHER_URL, { narrowIndex: SEAT.launcher }),
  makeSpaceViewDock(SPACE_VIEW_URL),
  makePocketDock(POCKET_URL, { narrowIndex: SEAT.pocket }),
  makeWorldLinesDock(WORLD_LINES_URL, { narrowIndex: SEAT.worldLines }),
];

/**
 * **最初に開いておくもの** ── 地図・アクティビティ・旅程の 3 つ。
 *
 * ★ この空間は「3 つが繋がって動く」ことが中身なので、**最初から 3 つ出しておく**。
 *   1 つずつ呼び出させると、繋がりが見えるまでに 3 手かかる。
 * ★ **並びは「最後に開いたものが真ん中に来る」**（`openAt` ＋ `bringToCenter`）。
 *   だから旅程を最後に置く ── 主役は旅程で、地図とアクティビティはそこへ渡す側。
 */
const INITIAL_URLS = [MAP_URL, ACTIVITIES_URL, ITINERARY_URL] as const;

/**
 * **大元の海だけの決め事。**
 * 両軸に魚眼を掛けたときの大きさのまとめ方を斜辺にする（既定は積）── 積だと
 * 4 隅へ泡を動かしたときの減衰が早すぎる。OS の海と同じ値にしてある。
 */
const SEA_RULES = { sizeCombine: "hypot" } as const;

/**
 * **世界線に入らないもの。**
 *
 * > 世界線を映すものは、世界線に入らない。
 *
 * 入れてしまうと、古い節へ移った瞬間に窓ごと消える（その節の姿には、あとから開いた
 * 窓が無いので）。
 */
const SEA_OUTSIDE = [WORLD_LINES_URL] as const;

export const TravelSea = () => {
  /** ルール: この空間の標準の呼び出しは、ランチャーに必ず 1 つずつ居る */
  useEnsureLauncherEntity({ launcherId: MAIN_LAUNCHER_ID, urls: DEFAULT_LAUNCHER_URLS });

  /** 開けるものの一覧はレジストリから引く（`./routes` の副作用で登録済み） */
  const routes = useBubbleRoutes();

  return (
    /**
     * ★ **泡はシャボン玉の皮を着る**（`BUBBLE_SKIN`）。器に口が無いので、
     *   配置に影響しない入れもの（`display: contents`）に印を付ける ── 皮は祖先の印で効く。
     */
    <div className={BUBBLE_SKIN} style={{ display: "contents" }}>
    <BubbleSea
      routes={routes}
      homes={HOMES}
      initialUrls={INITIAL_URLS}
      worldLineScope={ROOT_SEA_SCOPE}
      rules={SEA_RULES}
      worldLineOutside={SEA_OUTSIDE}
      /**
       * ★ **`100vh` ではなく `100dvh`。** `vh` は「ブラウザの UI を隠したときの高さ」なので、
       *   スマホでは見えている高さより大きい ── 下の縁に貼ったものがブラウザの UI の下に潜る。
       */
      style={{ height: "100dvh" }}
    />
    </div>
  );
};

export default TravelSea;
