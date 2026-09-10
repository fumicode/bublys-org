/**
 * 3Dビューの配色と形。
 *
 * **色は「値がどこにあるか」だけを語る**（2Dインスペクタと同じ表を使う）。
 * 「このノードで変わったか」は色ではなく**厚み**で語る。2つの軸を両方とも色にすると、
 * 明度の順序（memory > idb > lost > tombstone）が崩れて所在が読めなくなる。
 */
import { LOCATION_MARK, type RefLocation } from '../refLocation.js';
import type { Cell3D } from './types.js';

export type CellStyle = {
  /** 色は所在だけで決まる */
  readonly color: string;
  /** 板から -X（過去側）へ伸びる厚み。0 なら板と同一面 */
  readonly thickness: number;
  /** 外周リングを描くか（変わったセルの目印） */
  readonly ring: boolean;
  /** 墓標（潰れた帯） */
  readonly tombstone: boolean;
};

export const PALETTE_3D = {
  /** 背景。バブルの半透明ダークに馴染ませる */
  background: '#0d1117',
  plate: '#161b22',
  plateEdge: '#30363d',
  plateEdgeApex: '#58a6ff',
  plateEdgeRoot: '#7ee787',
  label: '#c9d1d9',
  /** 世界線のエッジ */
  edgeTime: '#8b949e',
  edgeBranch: '#d2a8ff',
  /** 入れ子のつながり。連動するかどうかで色を変える（嘘をつかないため） */
  nestLinked: '#58a6ff',
  nestNominal: '#6e7681',
  /** 空席 */
  empty: '#21262d',
} as const;

/**
 * セルの見た目。
 *
 * @param changedThickness 変わったセルが伸びる長さ（レイアウトの設定と揃える）
 */
export function cellStyle(
  cell: Pick<Cell3D, 'changed' | 'status'>,
  location: RefLocation,
  changedThickness: number
): CellStyle {
  const tomb = cell.status === 'tombstone';
  return {
    color: LOCATION_MARK[tomb ? 'tombstone' : location].color,
    // 墓標は伸ばさない（消えたものが手前に飛び出すと目立ちすぎる）
    thickness: cell.changed && !tomb ? changedThickness : 0,
    ring: cell.changed,
    tombstone: tomb,
  };
}

/** 世界線ごとの色（枝を見分ける）。決定的なハッシュで配る */
const WORLD_LINE_COLORS = [
  '#4fc3f7',
  '#81c784',
  '#ffb74d',
  '#e57373',
  '#ba68c8',
  '#4db6ac',
  '#fff176',
  '#f06292',
] as const;

export function worldLineColor(worldLineId: string): string {
  let sum = 0;
  for (let i = 0; i < worldLineId.length; i++) sum = (sum * 31 + worldLineId.charCodeAt(i)) >>> 0;
  return WORLD_LINE_COLORS[sum % WORLD_LINE_COLORS.length];
}
