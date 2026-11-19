/**
 * milestoneMark — 節目（milestone）の印
 *
 * 節目は、そのバブリが「この世界線の中で意味のある地点」と呼ぶノード（git の tag にあたる）。
 * 何を節目とするかはバブリが決め、ビューは `milestoneNodeIds` で受け取って**旗**を立てる
 * （例: hotel は勤務表の確定版のノードを渡す）。ライブラリはバブリの語彙を知らない。
 *
 * 旗の形はここ1か所で決め、成果木（SVG）と世界線ビュー（canvas）の両方がこれで描く
 * （同じ意味には、どのビューでも同じ記号）。apex の印（二重リング・光のにじみ）とは形で分ける。
 */

/** 旗の色（ノードの世界線の色とは独立。どの世界線の節目でも同じ色） */
export const MILESTONE_COLOR = '#f9a825';

/** ノードの中心 (x, y)・半径 r に立てる旗の形 */
export type MilestoneFlagShape = {
  /** 竿：ノードの縁から上へ */
  pole: { x1: number; y1: number; x2: number; y2: number };
  /** 旗：竿の先から右へなびく三角（頂点3つ） */
  pennant: [x: number, y: number][];
};

/** 旗の形を求める（純粋）。scale はビューの拡大率（canvas の魚眼などで小さくなる） */
export function milestoneFlagShape(x: number, y: number, r: number, scale = 1): MilestoneFlagShape {
  const poleH = 13 * scale;
  const flagW = 9 * scale;
  const flagH = 6 * scale;
  const px = x + r * 0.5;
  const top = y - r - poleH;
  return {
    pole: { x1: px, y1: y - r * 0.6, x2: px, y2: top },
    pennant: [
      [px, top],
      [px + flagW, top + flagH / 2],
      [px, top + flagH],
    ],
  };
}
