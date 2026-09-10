/**
 * 板（ノード1枚）の中身をキャンバスに焼く。**three には依存しない**（DOM だけ）。
 *
 * 板の上に並ぶセルは数十〜数百ある。これを1つずつ 3D のメッシュにすると
 * すぐ数千インスタンスになるうえ、面と面が重なって前後関係が壊れる。
 * 「変わっていないもの」は面の中の絵にしてしまえば、厚みの衝突が原理的に起きない。
 * 日本語のラベルも fillText でそのまま出る（three のテキストは日本語が豆腐になりやすい）。
 *
 * 厚みを持つ（＝このノードで変わった）セルだけを、別に 3D の箱として立てる。
 *
 * キャンバスの向き: 左上が「席 (col=0, row=0)」。板を正面から見たときの左上に対応する
 * （CanvasTexture は既定で flipY されるので、キャンバスの上が板の上になる）。
 */
import { LOCATION_MARK, type RefLocation } from '../refLocation.js';
import { PALETTE_3D, cellStyle } from './palette3d.js';
import { HEADER_UNITS, type Plate3D } from './types.js';

/** 1セルあたりのピクセル数（テクスチャの解像度） */
export const CELL_PX = 22;
/**
 * 上部のラベル帯の高さ（px）。
 * ★ 3D の格子（layout3d の HEADER_UNITS）から導く。別々に決めると絵と当たり判定がずれる。
 */
export const HEADER_PX = CELL_PX * HEADER_UNITS;

export type PaintOptions = {
  readonly cols: number;
  readonly rows: number;
  readonly locate?: (hash: string) => RefLocation;
  /** 選択中のノードなら枠を強調する */
  readonly selected?: boolean;
};

export function plateCanvasSize(opts: { cols: number; rows: number }) {
  return {
    width: Math.max(opts.cols, 1) * CELL_PX,
    height: HEADER_PX + Math.max(opts.rows, 1) * CELL_PX,
  };
}

/**
 * 板1枚を描く。呼び出し側でキャンバスを使い回せるよう、キャンバスを受け取る。
 * @returns 描いたセルの数（要約表示の申告に使う）
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

  // 下地
  ctx.fillStyle = PALETTE_3D.plate;
  ctx.fillRect(0, 0, width, height);

  // 枠。起点と現在地が一目で分かるように色を変える
  const edge = plate.isApex
    ? PALETTE_3D.plateEdgeApex
    : plate.isRoot
      ? PALETTE_3D.plateEdgeRoot
      : PALETTE_3D.plateEdge;
  ctx.strokeStyle = edge;
  ctx.lineWidth = opts.selected ? 4 : plate.isApex || plate.isRoot ? 3 : 1.5;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);

  // ラベル帯（ユーザーが付けた名前 > 意図の名前 > ノードID の先頭）
  const title =
    plate.label ?? plate.intentLabel ?? `${plate.nodeId.slice(0, 8)}…`;
  ctx.fillStyle = plate.label ? '#d2a8ff' : PALETTE_3D.label;
  ctx.font = `${plate.label ? 'bold ' : ''}14px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 6, HEADER_PX / 2, width - 12);

  // セル
  let drawn = 0;
  const pad = 2;
  for (const cell of plate.cells) {
    if (cell.slot.col >= opts.cols || cell.slot.row >= opts.rows) continue;
    const x = cell.slot.col * CELL_PX;
    const y = HEADER_PX + cell.slot.row * CELL_PX;
    const style = cellStyle(cell, opts.locate?.(cell.hash) ?? 'memory', 1);

    if (style.tombstone) {
      // 墓標：潰れた帯。「ここで消えた」が図から落ちないように出す
      ctx.fillStyle = LOCATION_MARK.tombstone.color;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x + pad, y + CELL_PX / 2 - 2, CELL_PX - pad * 2, 4);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = style.color;
      ctx.globalAlpha = style.ring ? 1 : 0.55;
      ctx.fillRect(x + pad, y + pad, CELL_PX - pad * 2, CELL_PX - pad * 2);
      ctx.globalAlpha = 1;
      if (style.ring) {
        // このノードで変わったセル。3D 側では厚みも持つ
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + pad, y + pad, CELL_PX - pad * 2, CELL_PX - pad * 2);
      }
    }
    // 入れ子を持つオブジェクトには印を付ける（ここから奥へ世界線が伸びる）
    if (cell.nestedScopeId) {
      ctx.fillStyle = PALETTE_3D.nestNominal;
      ctx.beginPath();
      ctx.arc(x + CELL_PX - pad - 3, y + pad + 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    drawn++;
  }
  return drawn;
}
