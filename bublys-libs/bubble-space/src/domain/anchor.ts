import type { Anchor, Side } from "./types.js";

/**
 * アンカーはホストの「中身座標系」における取り付け矩形。
 * 内側に出れば入れ子、外側に出れば隣接。違いは大きさを誰が決めるかと座標の持ち方だけ。
 *
 *   hole   ホストが決める（自前サイズの比率）。ゲストは枠に合わせる。
 *   seat   ゲストが決める。位置はホスト中身座標の絶対値。ホストを押し広げる。
 *   beside ゲストが決める。画面上で辺が接するだけ（ホストの座標系には入らない）。
 */
export const hole = (rx: number, ry: number, rw: number, rh: number): Anchor =>
  ({ kind: "hole", rx, ry, rw, rh });
export const seat = (x: number, y: number): Anchor => ({ kind: "seat", x, y });
export const beside = (side: Side, gap = 14): Anchor => ({ kind: "beside", side, gap });

/** そのアンカーがゲストの大きさを決めるか（＝ゲストは枠に従うか） */
export const anchorSizesGuest = (a: Anchor | undefined) => a?.kind === "hole";
/** アンカーがホストの外側にあるか（＝隣接） */
export const anchorIsOutside = (a: Anchor | undefined) => a?.kind === "beside";

/** 席とホストの中身のあいだに空ける余白 */
export const PAD = 14;
