/**
 * 板（ノード1枚）の中身をキャンバスに焼く。**three には依存しない**（DOM だけ）。
 *
 * 板の上に並ぶセルは数十〜数百ある。これを1つずつ 3D のメッシュにすると
 * すぐ数千インスタンスになるうえ、面と面が重なって前後関係が壊れる。
 * 「何も起きていないもの」は面の中の絵にしてしまえば、厚みの衝突が原理的に起きない。
 * 日本語のラベルも fillText でそのまま出る（three のテキストは日本語が豆腐になりやすい）。
 *
 * 出来事（作られた・変わった）のあったセルだけを、別に 3D の箱として立てる。
 *
 * キャンバスの向き: 左上が「席 (col=0, row=0)」。板を正面から見たときの左上に対応する
 * （CanvasTexture は既定で flipY されるので、キャンバスの上が板の上になる）。
 * 上に HEADER_UNITS のラベル帯、左に GUTTER_UNITS の型名欄がある。
 * どちらも 3D の格子と**同じ値**から導く（別々に決めると絵と当たり判定がずれる）。
 */
import type { RefLocation } from '../refLocation.js';
import { PALETTE_3D, cellStyle, locationEdgeColor } from './palette3d.js';
import { GUTTER_UNITS, HEADER_UNITS, type Plate3D } from './types.js';

/** 1セルあたりのピクセル数（テクスチャの解像度） */
export const CELL_PX = 26;
/** 上部のラベル帯の高さ（px）。3D の格子から導く */
export const HEADER_PX = CELL_PX * HEADER_UNITS;
/** 左の型名欄の幅（px）。3D の格子から導く */
export const GUTTER_PX = CELL_PX * GUTTER_UNITS;

export type PaintOptions = {
  readonly cols: number;
  readonly rows: number;
  readonly locate?: (hash: string) => RefLocation;
  /**
   * 選択中のノードか。枠を太くし、**セルを不透明で描く**。
   * いま読んでいる板を薄さで奥へ引っ込めないため。
   */
  readonly selected?: boolean;
};

export function plateCanvasSize(opts: { cols: number; rows: number }) {
  return {
    width: GUTTER_PX + Math.max(opts.cols, 1) * CELL_PX,
    height: HEADER_PX + Math.max(opts.rows, 1) * CELL_PX,
  };
}

/**
 * 板1枚を描く。呼び出し側でキャンバスを使い回せるよう、キャンバスを受け取る。
 * @returns 描いたセルの数
 */
export function paintPlate(
  canvas: HTMLCanvasElement,
  plate: Plate3D,
  opts: PaintOptions
): number {
  const { width, height } = plateCanvasSize(opts);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  ctx.clearRect(0, 0, width, height);

  // 下地。板そのものを半透明にして、奥のノードが透けて見えるようにする
  ctx.globalAlpha = PALETTE_3D.plateOpacity;
  ctx.fillStyle = PALETTE_3D.plate;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  // 枠。起点と現在地が一目で分かるように色を変える
  const edge = plate.isApex
    ? PALETTE_3D.plateEdgeApex
    : plate.isRoot
      ? PALETTE_3D.plateEdgeRoot
      : PALETTE_3D.plateEdge;
  ctx.strokeStyle = edge;
  ctx.lineWidth = opts.selected ? 5 : plate.isApex || plate.isRoot ? 3 : 1.5;
  ctx.strokeRect(
    ctx.lineWidth / 2,
    ctx.lineWidth / 2,
    width - ctx.lineWidth,
    height - ctx.lineWidth
  );

  // ラベル帯（ユーザーが付けた名前 > 意図の名前 > ノードID の先頭）
  const title = plate.label ?? plate.intentLabel ?? `${plate.nodeId.slice(0, 8)}…`;
  ctx.fillStyle = plate.label ? '#d2a8ff' : PALETTE_3D.label;
  ctx.font = `${plate.label ? 'bold ' : ''}15px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 8, HEADER_PX / 2, width - 16);

  // 左の型名欄。席は型ごとに行が分かれるので、行の先頭に型名を出せば
  // 全部のセルに文字を詰め込まなくても「これは何のオブジェクトか」が読める
  const typeOfRow = new Map<number, string>();
  for (const cell of plate.cells) {
    if (!typeOfRow.has(cell.slot.row)) typeOfRow.set(cell.slot.row, cell.type);
  }
  ctx.font = '12px system-ui, sans-serif';
  for (const [row, type] of typeOfRow) {
    if (row >= opts.rows) continue;
    ctx.fillStyle = PALETTE_3D.gutter;
    ctx.fillText(
      type,
      6,
      HEADER_PX + row * CELL_PX + CELL_PX / 2,
      GUTTER_PX - 10
    );
  }

  // セル
  let drawn = 0;
  const pad = 3;
  const size = CELL_PX - pad * 2;
  for (const cell of plate.cells) {
    if (cell.slot.col >= opts.cols || cell.slot.row >= opts.rows) continue;
    const x = GUTTER_PX + cell.slot.col * CELL_PX;
    const y = HEADER_PX + cell.slot.row * CELL_PX;
    const location = opts.locate?.(cell.hash) ?? 'memory';
    const style = cellStyle(cell, location, 1);

    // 選択中の世界は「いま読んでいる板」。ここだけ薄さを捨てる。
    // 何が起きたかは色（ACTION_COLOR）、値の所在は縁の色が持っているので、
    // α を 1 にしても図が語る内容は変わらない
    ctx.globalAlpha = opts.selected ? 1 : style.opacity;
    if (style.tombstone) {
      // 墓標：十字の墓。「ここで消えた」が図から落ちないように出す
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + CELL_PX / 2, y + pad);
      ctx.lineTo(x + CELL_PX / 2, y + CELL_PX - pad);
      ctx.moveTo(x + pad + 2, y + pad + 6);
      ctx.lineTo(x + CELL_PX - pad - 2, y + pad + 6);
      ctx.stroke();
    } else {
      ctx.fillStyle = style.color;
      ctx.fillRect(x + pad, y + pad, size, size);
      if (style.ring) {
        // 出来事のあったセル。3D 側では厚みも持つ
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + pad - 1.5, y + pad - 1.5, size + 3, size + 3);
      }
      // 値の所在は縁の色で出す（色相は出来事に使っているため）
      if (location !== 'memory') {
        ctx.strokeStyle = locationEdgeColor(location);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + pad, y + pad, size, size);
      }
    }
    ctx.globalAlpha = 1;

    // 入れ子を持つオブジェクトには印を付ける（ここから奥へ世界線が伸びる）。
    // 塗りつぶし＝開いている / 中抜き＝畳んでいる。
    // **畳んでも印は消さない**。消すと開き直す手がかりが図から無くなる
    if (cell.nestedScopeId) {
      ctx.beginPath();
      ctx.arc(x + CELL_PX - pad - 2, y + pad + 2, 3, 0, Math.PI * 2);
      if (cell.nestedShown) {
        ctx.fillStyle = PALETTE_3D.nestLinked;
        ctx.fill();
      } else {
        ctx.strokeStyle = PALETTE_3D.nestLinked;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    drawn++;
  }
  return drawn;
}
