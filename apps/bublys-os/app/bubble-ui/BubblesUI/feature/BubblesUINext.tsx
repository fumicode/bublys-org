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
import { bubbleRoutes } from "../registration/bubbleRoutes";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";

const LAUNCHER_URL = "launchers/main";
/** ランチャーの幅（アイコンだけ） */
const LAUNCHER_WIDTH = 60;
/** アイコンだけの泡の一辺（ポケット・世界線・説明と同じ） */
const ICON = 48;
/** 岸に貼ったものどうしのすき間 */
const GAP = 8;
/**
 * 横に寝た口の高さ。**これは測らずに決める** ── 中身なりの高さ（36）より少し高くして、
 * 指で押せる的にするため。幅のほうは中身に訊く（`fit`）。
 */
const BAR_HEIGHT = 44;

/**
 * **上の縁に見え方の口が入らない画面は、並べ方を変える。**
 *
 * > 端末の名前では決めない。**入るか入らないか**で決める。
 *
 * 上の縁の空きは「画面の幅 − 左のランチャー − 右上の世界線 − すき間」。ここに見え方の口の
 * 中身（実測 470）が入らないなら、横に並べる余地が無いということなので、
 * **上の縁はアイコン 1 列、下の縁は見え方の口を端から端まで**にする。
 *
 *   375 幅 → 空き 243 < 470 … 狭い並び（電話）
 *   768 幅 → 空き 636 ≥ 470 … ふだんの並び
 *
 * ★ 決まるのは**最初に貼るとき**。貼ったあとに窓の大きさが変わっても貼り直さない
 *   （岸は「居なければ置く」なので）。回して縦横が入れ替わったときは、いまの所そのまま。
 */
const SPACE_VIEW_NEED = 470;
const isNarrow = (vp: { width: number }): boolean =>
  vp.width - LAUNCHER_WIDTH - ICON - 3 * GAP < SPACE_VIEW_NEED;

/**
 * 狭い並びのときの、上の 1 列。左から順に詰める（ランチャー・他のデモ・説明・世界線・ポケット）。
 * 端から始めて、あとはアイコン 1 つぶんずつ。
 */
const topRowAt = (index: number) => ({ x: index * (ICON + GAP), y: 0 });

/**
 * ルール: **ランチャーは必ず居る。**
 * 最初は左の岸に、アイコンだけの幅で、端から端まで。
 * 海へ引き出して閉じてしまっても、**ここへ戻ってくる**（定位置）。
 */
const launcherDock = (viewport: { width: number; height: number }): Docked =>
  isNarrow(viewport)
    ? {
        // 狭い画面：上の 1 列の 1 番目。アイコンになって、押すと呼び出しが浮かぶ
        key: `${LAUNCHER_URL}#dock`,
        url: LAUNCHER_URL,
        dock: { edges: ["top"], at: topRowAt(0) },
        size: { width: ICON, height: ICON },
        ground: "none",
      }
    : {
        key: `${LAUNCHER_URL}#dock`,
        url: LAUNCHER_URL,
        // 左と上に着いているので、置き場所（at）は使われない（角に吸い付く）
        dock: { edges: ["left", "top"], at: { x: 0, y: 0 } },
        size: { width: LAUNCHER_WIDTH, height: viewport.height },
        ground: "light",
      };


const POCKET_URL = "pocket";

/**
 * ポケットの定位置 ── **右下の岸に、アイコンだけの大きさで**。
 *
 * 旧の「画面の右下に常設した面」を、岸の上の**普通の泡**として置き直したもの
 * ── 専用の仕掛けは 1 つも要らない。広げたければ辺を掴んで引けばよいし、
 * 要らなければ引き剥がせば海へ返る。
 */
const pocketDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${POCKET_URL}#dock`,
  url: POCKET_URL,
  // 狭い画面：上の 1 列の 5 番目。ふだんは右下の角（2 辺に着くので at は使われない）
  dock: isNarrow(viewport)
    ? { edges: ["top"], at: topRowAt(4) }
    : { edges: ["bottom", "right"], at: { x: 0, y: 0 } },
  size: { width: ICON, height: ICON },
  // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
  ground: "none",
});
const SPACE_VIEW_URL = "space-view";

/**
 * 見え方の口の大きさ ── **中身に訊く**（`fit`）。
 *
 * ★ 前はここに人が数えた幅（482）が書いてあった:
 *     選択 157 ＋ まかせる 78 ＋ 魚眼X 61 ＋ 魚眼Y 61 ＋ 帯 39 ＋ 全画面 30 ＝ 426
 *     ＋ すき間とと余白 48 → 474 → 余裕を見て 482
 *   本当の幅を決めているのは CSS なので、これは**その写し**。ボタンを 1 つ足したときに
 *   足し算をやり直し忘れて、**全画面の口が箱から押し出されて消えた**（実測で踏んだ）。
 * ★ いまは貼ったあとに中身を測って、その 1 回だけ大きさが決まる。下の数は
 *   **測り終えるまでの仮の姿**（高さは帯 1 本ぶん）。
 */
const SPACE_VIEW_SIZE = { width: 320, height: BAR_HEIGHT };

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
const spaceViewDock = (viewport: { width: number; height: number }): Docked =>
  isNarrow(viewport)
    ? {
        /**
         * 狭い画面：**下の縁を端から端まで**。上は 1 列のアイコンで埋まっているし、
         * これは中身がいちばん横に長いので、使える幅を全部やる。
         * それでも入り切らないぶんは転がして見る（`SpaceViewTools`）。
         */
        key: `${SPACE_VIEW_URL}#dock`,
        url: SPACE_VIEW_URL,
        dock: { edges: ["bottom"], at: { x: 0, y: 0 } },
        size: { width: viewport.width, height: BAR_HEIGHT },
        ground: "none",
      }
    : {
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
        // 幅は中身に訊く（最初の 1 回だけ）。高さは上の `BAR_HEIGHT` の決め事
        fit: "width",
        // 地は敷かない ── ボタンが空間の上に浮いて見える
        ground: "none",
      };

const DEMO_SITES_URL = "demo-sites";

/**
 * 他のデモへ行く口の大きさ ── **中身に訊く**（`fit`）。
 *
 * ★ 前はここにも人が数えた幅（360）が書いてあった。デモが 1 つ増えるたびに足し算を
 *   やり直す約束だったが、**誰もそれを知らない**。
 * ★ 下の数は測り終えるまでの仮の姿。
 */
const DEMO_SITES_SIZE = { width: 320, height: BAR_HEIGHT };

/**
 * 他のデモへ行く口の定位置 ── **下の縁の、ランチャーのすぐ右**。
 *
 * ★ どのデモに着いても全部へ行けるようにするためのものなので、**いつも見えている所**に置く。
 *   固定した面にはしない（新しい模型に固定の置き場所は無い）── 岸に貼った泡にしておけば、
 *   引き剥がして海に浮かべることも、閉じることもできる。
 * ★ 下の縁にしたのは、上は見え方の口、左はランチャー、右下はポケットが使っているから。
 *   左端から置く（横の中間にすると、右下のポケットと目が競る）。
 */
const demoSitesDock = (viewport: { width: number; height: number }): Docked =>
  isNarrow(viewport)
    ? {
        // 狭い画面：上の 1 列の 2 番目。アイコンになって、押すと行き先が浮かぶ
        key: `${DEMO_SITES_URL}#dock`,
        url: DEMO_SITES_URL,
        dock: { edges: ["top"], at: topRowAt(1) },
        size: { width: ICON, height: ICON },
        ground: "none",
      }
    : {
        key: `${DEMO_SITES_URL}#dock`,
        url: DEMO_SITES_URL,
        dock: { edges: ["bottom"], at: { x: LAUNCHER_WIDTH + 8, y: 0 } },
        size: DEMO_SITES_SIZE,
        // 幅は中身に訊く（最初の 1 回だけ）。高さは上の `BAR_HEIGHT` の決め事
        fit: "width",
        // 地は敷かない ── ボタンが空間の上に浮いて見える（見え方の口と同じ）
        ground: "none",
      };

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
  // 狭い画面：上の 1 列の 4 番目。ふだんは右上の角（2 辺に着くので at は使われない）
  dock: isNarrow(viewport)
    ? { edges: ["top"], at: topRowAt(3) }
    : { edges: ["top", "right"], at: { x: viewport.width, y: 0 } },
  size: { width: ICON, height: ICON },
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
  // 狭い画面：上の 1 列の 3 番目。ふだんは右の縁の、世界線のすぐ下
  dock: isNarrow(viewport)
    ? { edges: ["top"], at: topRowAt(2) }
    : { edges: ["right"], at: { x: viewport.width, y: ICON + GAP } },
  size: { width: ICON, height: ICON },
  // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
  ground: "none",
});

/**
 * **定位置に居てほしいもの。** 居なくなったら、ここへ戻ってくる。
 * 岸に貼ってある間は閉じる口が無いので、消えるのは海へ出して閉じたときだけ。
 */
/**
 * ★ 外へ出しているのは、**本番の定位置をそのまま台（`app/shore-fit`）で見るため**。
 *   台に同じ並びを書き写すと、片方だけ古くなる。
 */
export const HOMES: readonly Home[] = [
  launcherDock,
  spaceViewDock,
  pocketDock,
  demoSitesDock,
  worldLinesDock,
  guideDock,
];

/**
 * **大元の海だけの決め事。**
 *
 * ★ 両軸に魚眼を掛けたとき、大きさのまとめ方を**斜辺**にする（既定は積）。
 *   積だと遠さが縦横で 2 回掛かるので、**4 隅へ泡を動かしたときの減衰が早すぎた**
 *   （u ＝ H の隅で 0.1764。上下左右は 0.4200）。斜辺なら 0.2932 ── 隅は上下左右より
 *   小さいまま、減衰は斜辺 1 本ぶんで済む（`bubble-layout` の `lens.ts` の `sizeFit`）。
 * ★ **渡すのはここだけ。** 一覧・折り返す魚眼・窓の中の海は別の空間なので、1px も変わらない
 *   （刻みで並ぶ軸は、この口に何を渡しても積のまま ── 隣どうしがぴたり接するのを守るため）。
 */
const SEA_RULES = { sizeCombine: 'hypot' } as const;

/**
 * **世界線に入らないもの。**
 *
 * > 世界線を映すものは、世界線に入らない。
 *
 * 世界線の泡は「いまどの節に居るか」を映す窓であって、海の姿の一部ではない。
 * 入れてしまうと、**古い節へ移った瞬間に窓ごと消える**（その節の姿には、あとから開いた
 * 窓が無いので）。開く・動かす・広げるも顔ぶれの変化として節になり、
 * 移った先で書けばそこが分岐になってしまう。
 */
const SEA_OUTSIDE = [WORLD_LINES_URL] as const;

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
      rules={SEA_RULES}
      worldLineOutside={SEA_OUTSIDE}
      /**
       * ★ **`100vh` ではなく `100dvh`。** `vh` は「ブラウザの UI を隠したときの高さ」なので、
       *   スマホでは**いま見えている高さより 50〜100px 大きい**。器がそのぶん下へ伸びて、
       *   下の縁に貼ったもの（狭い画面では見え方の口）が**ブラウザの UI の下に潜る**
       *   ── 実測：器を 80px 高くすると、帯の下端が見えている高さより 80px 下へ行った。
       *   `dvh` はいま見えている高さを指すので、岸の座標（`window.innerHeight`）と揃う。
       */
      style={{ height: "100dvh" }}
    />
  );
};
