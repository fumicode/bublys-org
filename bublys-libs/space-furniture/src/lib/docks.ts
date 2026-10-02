/**
 * **岸に貼る家具の定位置** ── どの縁の、どこに、どれだけの大きさで貼るか。
 *
 * ★ **ここに居るのは、どの空間にも居てよいものだけ**（ランチャー・見え方の口・
 *   ポケット・世界線）。「他のデモへ行く口」「説明」のような、その空間だけのものは
 *   使う側（OS など）が自分で持つ ── 全部ここへ入れると、この lib が
 *   「OS の画面そのもの」になってしまい、別の空間が被れなくなる。
 * ★ 定位置は**作る関数**として出す（`makeXxxDock`）。狭い画面のときの並び順は
 *   「その空間に何が貼ってあるか」で変わるので、番号は使う側が渡す。
 */
import type { Docked, Home } from "@bublys-org/bubble-space-shell";

/** ランチャーの幅（アイコンだけ） */
export const LAUNCHER_WIDTH = 60;
/** アイコンだけの泡の一辺（ポケット・世界線・説明と同じ） */
export const ICON = 48;
/** 岸に貼ったものどうしのすき間 */
export const GAP = 8;
/**
 * 横に寝た口の高さ。**これは測らずに決める** ── 中身なりの高さ（36）より少し高くして、
 * 指で押せる的にするため。幅のほうは中身に訊く（`fit`）。
 */
export const BAR_HEIGHT = 44;

/** 見え方の口の中身が要る幅（実測） */
const SPACE_VIEW_NEED = 470;

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
 *   （岸は「居なければ置く」なので）。
 */
export const isNarrow = (vp: { width: number }): boolean =>
  vp.width - LAUNCHER_WIDTH - ICON - 3 * GAP < SPACE_VIEW_NEED;

/**
 * 狭い並びのときの、上の 1 列。左から順に詰める。
 * 端から始めて、あとはアイコン 1 つぶんずつ。
 */
export const topRowAt = (index: number): { x: number; y: number } => ({
  x: index * (ICON + GAP),
  y: 0,
});

/** 狭い画面のときに上の 1 列の何番目に来るか */
export type NarrowSeat = { narrowIndex: number };

/**
 * ルール: **ランチャーは必ず居る。**
 * 最初は左の岸に、アイコンだけの幅で、端から端まで。
 * 海へ引き出して閉じてしまっても、**ここへ戻ってくる**（定位置）。
 */
export const makeLauncherDock = (url: string, seat: NarrowSeat): Home =>
  (viewport) =>
    isNarrow(viewport)
      ? ({
          // 狭い画面：アイコンになって、押すと呼び出しが浮かぶ
          key: `${url}#dock`,
          url,
          dock: { edges: ["top"], at: topRowAt(seat.narrowIndex) },
          size: { width: ICON, height: ICON },
          ground: "none",
        } satisfies Docked)
      : ({
          key: `${url}#dock`,
          url,
          // 左と上に着いているので、置き場所（at）は使われない（角に吸い付く）
          dock: { edges: ["left", "top"], at: { x: 0, y: 0 } },
          size: { width: LAUNCHER_WIDTH, height: viewport.height },
          ground: "light",
        } satisfies Docked);

/**
 * 見え方の口の大きさ ── **中身に訊く**（`fit`）。下の数は測り終えるまでの仮の姿。
 *
 * ★ 前はここに人が数えた幅（482）が書いてあった。本当の幅を決めているのは CSS なので、
 *   それは写し ── ボタンを 1 つ足したときに足し算をやり直し忘れて、
 *   **全画面の口が箱から押し出されて消えた**（実測で踏んだ）。
 */
export const SPACE_VIEW_SIZE = { width: 320, height: BAR_HEIGHT };

/**
 * 見え方の口の定位置 ── **上の縁の、横の中間**。
 *
 * ★ 中間は**ランチャーの幅を除いた残り**で測る。窓の真ん中で測ると、ランチャーのぶん
 *   左に寄って見える（岸として塞がっている所は、空いている所ではない）。
 * ★ 横の中心は**窓の幅から毎回出す** ── 固定の数で持つと窓の大きさが変わったときにずれる。
 */
export const makeSpaceViewDock = (url: string): Home =>
  (viewport) =>
    isNarrow(viewport)
      ? ({
          /**
           * 狭い画面：**下の縁を端から端まで**。上は 1 列のアイコンで埋まっているし、
           * これは中身がいちばん横に長いので、使える幅を全部やる。
           */
          key: `${url}#dock`,
          url,
          dock: { edges: ["bottom"], at: { x: 0, y: 0 } },
          size: { width: viewport.width, height: BAR_HEIGHT },
          ground: "none",
        } satisfies Docked)
      : ({
          key: `${url}#dock`,
          url,
          dock: {
            edges: ["top"],
            at: {
              x: Math.round(
                LAUNCHER_WIDTH + (viewport.width - LAUNCHER_WIDTH - SPACE_VIEW_SIZE.width) / 2,
              ),
              y: 0,
            },
          },
          size: SPACE_VIEW_SIZE,
          // 幅は中身に訊く（最初の 1 回だけ）。高さは上の `BAR_HEIGHT` の決め事
          fit: "width",
          // 地は敷かない ── ボタンが空間の上に浮いて見える
          ground: "none",
        } satisfies Docked);

/**
 * ポケットの定位置 ── **右下の岸に、アイコンだけの大きさで**。
 *
 * 旧の「画面の右下に常設した面」を、岸の上の**普通の泡**として置き直したもの
 * ── 専用の仕掛けは 1 つも要らない。広げたければ辺を掴んで引けばよい。
 */
export const makePocketDock = (url: string, seat: NarrowSeat): Home =>
  (viewport) => ({
    key: `${url}#dock`,
    url,
    // ふだんは右下の角（2 辺に着くので at は使われない）
    dock: isNarrow(viewport)
      ? { edges: ["top"], at: topRowAt(seat.narrowIndex) }
      : { edges: ["bottom", "right"], at: { x: 0, y: 0 } },
    size: { width: ICON, height: ICON },
    // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
    ground: "none",
  });

/**
 * 世界線の定位置 ── **右上の角**。
 *
 * ★ 角にしたのは、ほかの縁がもう使われているから（左＝ランチャー、上の中央＝見え方の口）。
 *   **いつも見えている所**に置きたいが、海の使いはじめを塞ぎたくはない ── 角はどちらも満たす。
 * ★ ポケットと同じ大きさにする。どちらも**小さいときはアイコン**になる泡なので、
 *   同じ見た目にしておけば、置き場所が違っても役割が同じだと判る。
 */
export const makeWorldLinesDock = (url: string, seat: NarrowSeat): Home =>
  (viewport) => ({
    key: `${url}#dock`,
    url,
    dock: isNarrow(viewport)
      ? { edges: ["top"], at: topRowAt(seat.narrowIndex) }
      : { edges: ["top", "right"], at: { x: viewport.width, y: 0 } },
    size: { width: ICON, height: ICON },
    ground: "none",
  });
