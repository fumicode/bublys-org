/**
 * 3Dビューの配色と形。
 *
 * **色は「そのノードで何が起きたか」を語る**。世界線を見る人がまず知りたいのは
 * 出来事（作られた・変わった・消えた）なので、そこに一番強い色を割り当てる。
 *
 *   作られた = 白    変わった = 黄    消された = 赤（墓標）    何も起きていない = 淡い灰
 *
 * 値の所在（メモリ／永続のみ／消失）は別の軸なので、色ではなく**明るさと縁**で出す。
 * 2つの軸を両方とも色相にすると、どちらも読めなくなる。
 */
import { LOCATION_MARK, type RefLocation } from '../refLocation.js';
import type { Cell3D, CellAction, CellRole, OutsideMatch } from './types.js';

export type CellStyle = {
  readonly color: string;
  /** 板から -X（過去側）へ伸びる厚み。0 なら板と同一面 */
  readonly thickness: number;
  /** 不透明度。何も起きていないセルは薄くして、出来事を前に出す */
  readonly opacity: number;
  /** 外周の縁を描くか */
  readonly ring: boolean;
  /** 墓標（潰れた帯）として描くか */
  readonly tombstone: boolean;
};

/** 出来事の色。ここが3Dビューの読み方の核なので、1箇所にまとめる */
export const ACTION_COLOR: Record<CellAction, string> = {
  created: '#ffffff',
  changed: '#e3b341',
  deleted: '#f85149',
  unchanged: '#8b949e',
};

export const ACTION_LABEL: Record<CellAction, string> = {
  created: '作られた',
  changed: '変わった',
  deleted: '消された',
  unchanged: 'そのまま',
};

export const ACTION_ORDER: readonly CellAction[] = [
  'created',
  'changed',
  'deleted',
  'unchanged',
];

/**
 * 世界での立場の色。
 *
 * シアンは、出来事（白・黄・赤・淡灰）とも、所在（緑・橙・赤・灰）とも、
 * 入れ子（青・灰）とも、分岐（紫）とも当たらない**唯一の残り色相**。
 * 暗い背景 (#0d1117) に対して十分明るい。
 *
 * 'member' と 'external' には色を割り当てない。図に出したいのは
 * 「外の変更が届かない」ことであって、普通のメンバーを飾ることではない。
 */
export const ROLE_COLOR: Record<CellRole, string | null> = {
  pinned: '#39c5cf',
  member: null,
  external: null,
};

export const ROLE_LABEL: Record<CellRole, string> = {
  pinned: '固定（生まれたときに焼き付け）',
  member: 'この世界のもの',
  external: '外のもの',
};

/** 外の現在地との食い違い。**新しい色相を増やさず、出来事の色をそのまま外向きに使う** */
export const OUTSIDE_COLOR: Record<OutsideMatch, string | null> = {
  same: null,
  differs: ACTION_COLOR.changed,
  absent: ACTION_COLOR.deleted,
  unknown: null,
};

export const OUTSIDE_LABEL: Record<OutsideMatch, string> = {
  same: '外の現在地と同じ',
  differs: '外では別の値になっている（固定が効いています）',
  absent: '外の現在地には無い（固定が効いています）',
  unknown: '外が読めない（比べていません）',
};

export const PALETTE_3D = {
  /** 背景。バブルの半透明ダークに馴染ませる */
  background: '#0d1117',
  plate: '#161b22',
  plateEdge: '#30363d',
  plateEdgeApex: '#58a6ff',
  plateEdgeRoot: '#7ee787',
  label: '#c9d1d9',
  /** 型名を書く左の余白 */
  gutter: '#79c0ff',
  /** 板そのものの不透明度。奥のノードが透けて見えるように */
  plateOpacity: 0.42,
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
 * @param location 値の所在。色相は変えず、**明るさ**にだけ効かせる
 * @param changedThickness 出来事のあったセルが伸びる長さ（レイアウトの設定と揃える）
 */
export function cellStyle(
  cell: Pick<Cell3D, 'action'> & Partial<Pick<Cell3D, 'role'>>,
  location: RefLocation,
  changedThickness: number
): CellStyle {
  const happened = cell.action !== 'unchanged';
  // 手元に無い値は薄く出す（あるのに読めない、が分かるように）
  const dim = location === 'lost' ? 0.35 : location === 'idb' ? 0.7 : 1;
  // 固定メンバーは構造上いつも「そのまま」なので、淡灰のまま置くと
  // 図の中で一番見えないセルになる。**そのままの区間だけ**シアンで出して、
  // 「ここは動かない」を色で言う。焼き付けた瞬間は 'created'（白）のまま残す
  const pinnedStill = cell.role === 'pinned' && !happened;
  return {
    color: pinnedStill ? (ROLE_COLOR.pinned as string) : ACTION_COLOR[cell.action],
    // 墓標は伸ばさない（消えたものが手前に飛び出すと目立ちすぎる）
    thickness: happened && cell.action !== 'deleted' ? changedThickness : 0,
    opacity: (happened ? 0.95 : pinnedStill ? 0.6 : 0.3) * dim,
    ring: happened,
    tombstone: cell.action === 'deleted',
  };
}

/** 所在を縁の色で出す（色相は出来事に使っているので、所在は縁に逃がす） */
export function locationEdgeColor(location: RefLocation): string {
  return LOCATION_MARK[location].color;
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
  for (let i = 0; i < worldLineId.length; i++)
    sum = (sum * 31 + worldLineId.charCodeAt(i)) >>> 0;
  return WORLD_LINE_COLORS[sum % WORLD_LINE_COLORS.length];
}
