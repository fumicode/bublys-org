"use client";
/**
 * **OS の海** ── 器（`BubbleSea`）に、OS の家具と OS で開けるものを載せたもの。
 *
 * ★ 海そのものは `@bublys-org/bubble-space-shell` に出した。単体で開いたバブリも
 *   同じ器を被るので、**同じ一覧が OS でも単体でも同じように並ぶ**。
 *   ここに残るのは「OS には何が定位置に居るか」だけ ── ランチャー・見え方の口・
 *   ポケット・他のデモへ行く口の 4 つ。
 */
import { BubbleSea, type Docked, type Home, type SeaSeed } from "@bublys-org/bubble-space-shell";
/**
 * ★ **家具は lib から借りる**（`@bublys-org/space-furniture`）。世界線・見え方の口・
 *   ポケット・ランチャーは「どの空間にも居てよいもの」なので、OS の中に置いておくと
 *   別の空間（旅程の SPA など）が同じ手ざわりを持てない。ここに残すのは
 *   **この OS だけの家具**（他のデモへ行く口・説明）と、その並べ方だけ。
 */
import {
  ROOT_SEA_SCOPE,
  WORLD_LINES_URL,
  POCKET_URL,
  SPACE_VIEW_URL,
  ICON,
  GAP,
  BAR_HEIGHT,
  LAUNCHER_WIDTH,
  isNarrow,
  topRowAt,
  makeLauncherDock,
  makeSpaceViewDock,
  makePocketDock,
  makeWorldLinesDock,
} from "@bublys-org/space-furniture";
import { useBubbleRoutes } from "@bublys-org/bubbles-ui";
// 組み込みのルートをレジストリに登録するための副作用 import（一覧は下で hook から引く）
import "../registration/bubbleRoutes";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";
import { useEnsureBublyLaunchers } from "@/app/launcher/useEnsureBublyLaunchers";
import seaSeedJson from "../seed/sea-seed.json";
import { useSeedOnFirstOpen } from "../seed/useSeedOnFirstOpen";

const LAUNCHER_URL = "launchers/main";

/**
 * **狭い画面での上の 1 列の並び順。** 左から詰める ──
 * ランチャー・他のデモ・説明・世界線・ポケット。
 * 番号を持つのは空間の側（何が貼ってあるかで変わるので、家具の lib は知らない）。
 */
const SEAT = {
  launcher: 0,
  demoSites: 1,
  guide: 2,
  worldLines: 3,
  pocket: 4,
} as const;

const launcherDock = makeLauncherDock(LAUNCHER_URL, { narrowIndex: SEAT.launcher });
const spaceViewDock = makeSpaceViewDock(SPACE_VIEW_URL);
const pocketDock = makePocketDock(POCKET_URL, { narrowIndex: SEAT.pocket });
const worldLinesDock = makeWorldLinesDock(WORLD_LINES_URL, { narrowIndex: SEAT.worldLines });

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
        dock: { edges: ["top"], at: topRowAt(SEAT.demoSites) },
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
 * **はじまりの海。** はじめて OS を開いた人（世界線に記録が 1 つも無い人）は、この並びから始まる。
 *
 * ★ 作り方：世界線の泡を広げて右上の ⬇ で書き出したもの（`sea-seed.json`）を、ここへ置く。
 * ★ 入れてあるのは**海の並びだけ**。岸（ランチャーなどの定位置）は抜いてある ──
 *   書き出した画面で測った座標なので、定位置の側に開いた画面に合わせて置いてもらう。
 * ★ 泡が指す中身は、組み込みのもの（地点・宿・ユーザー）か、一緒に撒くもの
 *   （`world-seed.json` の囲碁と旅程。`useSeedOnFirstOpen`）だけにする。
 *   どちらでもないものを指すと、新しいブラウザでは中身の無い泡になる。
 */
const SEA_SEED = seaSeedJson as unknown as SeaSeed;

/**
 * ルール: **家具は OS が持ち、海は器が立てる。**
 * ランチャー集約（呼び出しの中身）は Redux にある ── 泡として出すのは海の仕事。
 */
export const BubblesUINext = () => {
  useEnsureMainLauncherEntity();
  /**
   * ★ ロードしたバブリは、自分の呼び出しを 1 つ持つ ── 窓の岸に貼るのは器、
   *   中身を用意するのはこちら（`useEnsureBublyLaunchers` の註）。
   */
  useEnsureBublyLaunchers();
  /** はじめて開いた人には、海の泡が指す中身（囲碁・旅程・地図）も撒く（海の種と同じ「はじめて」） */
  useSeedOnFirstOpen(ROOT_SEA_SCOPE);
  /**
   * ★ **開けるものの一覧は、レジストリから引く。** 組み込みのぶんも、あとから
   *   ロードしたバブリのぶんも同じ所に居る（`useBubbleRoutes` の註）。
   */
  const routes = useBubbleRoutes();
  /**
   * ★ **この空間の世界線は、root という名で記録する。** 世界線の泡（`WorldLineHomeBubble`）が
   *   読むのと同じ名前にしておく ── 別の名前にすると、記録はされているのに何も映らない。
   */
  return (
    <BubbleSea
      routes={routes}
      homes={HOMES}
      worldLineScope={ROOT_SEA_SCOPE}
      rules={SEA_RULES}
      worldLineOutside={SEA_OUTSIDE}
      worldLineSeed={SEA_SEED}
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
