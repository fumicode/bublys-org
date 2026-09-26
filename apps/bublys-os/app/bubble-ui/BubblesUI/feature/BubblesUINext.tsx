"use client";
/**
 * **OS の海** ── 器（`BubbleSea`）に、OS の家具と OS で開けるものを載せたもの。
 *
 * ★ 海そのものは `@bublys-org/bubble-space-shell` に出した。単体で開いたバブリも
 *   同じ器を被るので、**同じ一覧が OS でも単体でも同じように並ぶ**。
 *   ここに残るのは「OS には何が定位置に居るか」だけ ── ランチャー・見え方の口・
 *   ポケット・他のデモへ行く口の 4 つ。
 */
import { BubbleSea, type Docked, type Home } from "@bublys-org/bubble-space-shell";
import { ROOT_SEA_SCOPE } from "./WorldLineHomeBubble";
import { bubbleRoutes } from "../domain/bubbleRoutes";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";

const LAUNCHER_URL = "launchers/main";
/** ランチャーの幅（アイコンだけ） */
const LAUNCHER_WIDTH = 60;

/**
 * ルール: **ランチャーは必ず居る。**
 * 最初は左の岸に、アイコンだけの幅で、端から端まで。
 * 海へ引き出して閉じてしまっても、**ここへ戻ってくる**（定位置）。
 */
const launcherDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${LAUNCHER_URL}#dock`,
  url: LAUNCHER_URL,
  // 左と上に着いているので、置き場所（at）は使われない（角に吸い付く）
  dock: { edges: ["left", "top"], at: { x: 0, y: 0 } },
  size: { width: LAUNCHER_WIDTH, height: viewport.height },
  ground: "light",
});


const POCKET_URL = "pocket";

/**
 * ポケットの定位置 ── **右下の岸に、アイコンだけの大きさで**。
 *
 * 旧の「画面の右下に常設した面」を、岸の上の**普通の泡**として置き直したもの
 * ── 専用の仕掛けは 1 つも要らない。広げたければ辺を掴んで引けばよいし、
 * 要らなければ引き剥がせば海へ返る。
 */
const pocketDock = (): Docked => ({
  key: `${POCKET_URL}#dock`,
  url: POCKET_URL,
  // 2 辺に着いているので、置き場所（at）は使われない（角に吸い付く）
  dock: { edges: ["bottom", "right"], at: { x: 0, y: 0 } },
  size: { width: 48, height: 48 },
  // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
  ground: "none",
});
const SPACE_VIEW_URL = "space-view";

/**
 * 見え方の口の大きさ。**中身の実測から決める**（箱が中身より広いと、右に空きが残る）。
 *   選択 157 ＋ まかせる 78 ＋ 魚眼X 61 ＋ 魚眼Y 61 ＋ 帯 39 ＋ 全画面 30 ＝ 426
 *   ＋ すき間 8×5 ＝ 40 ＋ 左右の余白 4×2 ＝ 8 → 474。少し余裕を見て 482。
 * ★ 帯（どこから開いたか）の口を足したぶん、436 から広げた。狭いままだと
 *   **全画面の口が箱から押し出されて消える**（実測で踏んだ）。
 */
const SPACE_VIEW_SIZE = { width: 482, height: 44 };

/**
 * 見え方の口の定位置 ── **上の縁の、横の中間**。
 *
 * ★ 中間は**サイドバーの幅を除いた残り**で測る。窓の真ん中で測ると、サイドバーのぶん
 *   左に寄って見える（岸として塞がっている所は、空いている所ではない）。
 * ★ 前はランチャーのすぐ右どなりに詰めて置いていたが、**上の縁の使いはじめを塞いで**いた。
 *   真ん中なら左右どちらにも余地が残る。
 * ★ 横の中心は**窓の幅から毎回出す**（定位置は viewport を受け取る）── 固定の数で持つと
 *   窓の大きさが変わったときに中間からずれる。
 */
const spaceViewDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${SPACE_VIEW_URL}#dock`,
  url: SPACE_VIEW_URL,
  dock: {
    edges: ["top"],
    at: {
      x: Math.round(LAUNCHER_WIDTH + (viewport.width - LAUNCHER_WIDTH - SPACE_VIEW_SIZE.width) / 2),
      y: 0,
    },
  },
  size: SPACE_VIEW_SIZE,
  // 地は敷かない ── ボタンが空間の上に浮いて見える
  ground: "none",
});

const DEMO_SITES_URL = "demo-sites";

/**
 * 他のデモへ行く口の大きさ。**中身の実測から決める**（箱が中身より広いと、右に空きが残る）。
 *   見出し 52 ＋ シフトントン 100 ＋ 世界線囲碁 88 ＋ 学会シフト 88 ＝ 328
 *   ＋ すき間 6×3 ＝ 18 ＋ 左右の余白 4×2 ＝ 8 → 354。少し余裕を見て 360。
 *
 * ★ この画面の中なので **bublys OS は出さない**（`DemoSitesBubble` の註）。
 *   出していた頃は 430 だったので、外したぶん 70 詰めた。
 */
const DEMO_SITES_SIZE = { width: 360, height: 44 };

/**
 * 他のデモへ行く口の定位置 ── **下の縁の、ランチャーのすぐ右**。
 *
 * ★ どのデモに着いても全部へ行けるようにするためのものなので、**いつも見えている所**に置く。
 *   固定した面にはしない（新しい模型に固定の置き場所は無い）── 岸に貼った泡にしておけば、
 *   引き剥がして海に浮かべることも、閉じることもできる。
 * ★ 下の縁にしたのは、上は見え方の口、左はランチャー、右下はポケットが使っているから。
 *   左端から置く（横の中間にすると、右下のポケットと目が競る）。
 */
const demoSitesDock = (): Docked => ({
  key: `${DEMO_SITES_URL}#dock`,
  url: DEMO_SITES_URL,
  dock: { edges: ["bottom"], at: { x: LAUNCHER_WIDTH + 8, y: 0 } },
  size: DEMO_SITES_SIZE,
  // 地は敷かない ── ボタンが空間の上に浮いて見える（見え方の口と同じ）
  ground: "none",
});

const WORLD_LINES_URL = "world-lines";

/**
 * 世界線の定位置 ── **右上の角**。
 *
 * ★ 角にしたのは、ほかの縁がもう使われているから（左＝ランチャー、上の中央＝見え方の口、
 *   下＝デモへ行く口、右下＝ポケット）。**いつも見えている所**に置きたいが、
 *   海の使いはじめを塞ぎたくはない ── 角はどちらも満たす。
 * ★ ポケットと同じ大きさにする。どちらも**小さいときはアイコン**になる泡なので、
 *   同じ見た目にしておけば、置き場所が違っても役割が同じだと判る。
 *   広げれば、この泡そのものが世界線を映す（`WorldLineHomeBubble`）。
 */
const worldLinesDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${WORLD_LINES_URL}#dock`,
  url: WORLD_LINES_URL,
  // 2 辺に着いているので、置き場所（at）は使われない（角に吸い付く）
  dock: { edges: ["top", "right"], at: { x: viewport.width, y: 0 } },
  size: { width: 48, height: 48 },
  // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
  ground: "none",
});

const GUIDE_URL = "guide";

/**
 * 説明の定位置 ── **右の縁、世界線のすぐ下**。
 *
 * ★ 世界線と並べる。どちらも「押すと開く小さな口」で、広げれば自分が中身を映す泡なので、
 *   同じ大きさ・同じ縁に置いておけば役割が同じだと判る。
 */
const guideDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${GUIDE_URL}#dock`,
  url: GUIDE_URL,
  dock: { edges: ["right"], at: { x: viewport.width, y: 56 } },
  size: { width: 48, height: 48 },
  // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
  ground: "none",
});

/**
 * **定位置に居てほしいもの。** 居なくなったら、ここへ戻ってくる。
 * 岸に貼ってある間は閉じる口が無いので、消えるのは海へ出して閉じたときだけ。
 */
const HOMES: readonly Home[] = [
  launcherDock,
  spaceViewDock,
  pocketDock,
  demoSitesDock,
  worldLinesDock,
  guideDock,
];

/**
 * ルール: **家具は OS が持ち、海は器が立てる。**
 * ランチャー集約（呼び出しの中身）は Redux にある ── 泡として出すのは海の仕事。
 */
export const BubblesUINext = () => {
  useEnsureMainLauncherEntity();
  /**
   * ★ **この空間の世界線は、root という名で記録する。** 世界線の泡（`WorldLineHomeBubble`）が
   *   読むのと同じ名前にしておく ── 別の名前にすると、記録はされているのに何も映らない。
   */
  return (
    <BubbleSea
      routes={bubbleRoutes}
      homes={HOMES}
      worldLineScope={ROOT_SEA_SCOPE}
      style={{ height: "100vh" }}
    />
  );
};
