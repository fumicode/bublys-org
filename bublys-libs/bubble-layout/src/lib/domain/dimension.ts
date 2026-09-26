/**
 * ① 次元 ── 泡 → 値。
 *
 * 元：lab.html 342-364 行（DIMS と verbOf）
 *
 * write は「ドラッグでその軸に何が起きるか」。null ＝ 書けない ＝ 視点が動く（規則②）。
 */
import type { Axis, SpaceId } from './types.js';
import type { Bubble } from './bubble.js';
import type { BubbleWorld } from './world.js';

export type DimensionId =
  | 'none'
  | 'free.x'
  | 'free.y'
  | 'free.z'
  | 'order'
  | 'col'
  | 'row'
  | 'history.index'
  | 'history.age'
  | 'history.branch';

/** 軸に刺さった次元で、ドラッグが何をするか。lab.html 364 行 verbOf */
export type Verb = 'coord' | 'reorder' | 'cell' | 'focus' | 'none';

/** write が 'coord' / 'cell' のとき、泡のどのフィールドに書くか */
export type WriteKey = Axis | 'col' | 'row';

export interface Dimension {
  readonly id: DimensionId;
  readonly label: string;
  /** 書ける種類。null ＝ 書けない（視点が動く） */
  readonly write: 'coord' | 'reorder' | 'cell' | null;
  /** 'coord'（free.x/y/z）と 'cell'（col/row）が書くフィールド */
  readonly key?: WriteKey;
  /**
   * 泡 → 値。
   * ★ 空間と世界を受け取る：「履歴の古さ」は **その空間の**最大世代から測るため（lab.html 356-358 行、v2 で踏んだ）。
   */
  read(bubble: Bubble, spaceId: SpaceId, world: BubbleWorld): number;
}

/**
 * 次元の表。lab.html 343-354 行 DIMS そのまま。
 * read は「泡 → 値」。'history.age' だけが空間を見る（その空間の最大世代から測るので）。
 */
export const DIMENSIONS: Readonly<Record<DimensionId, Dimension>> = {
  'none': { id: 'none', label: 'なし', write: null, read: () => 0 },
  'free.x': { id: 'free.x', label: '自由X', write: 'coord', key: 'x', read: (b) => b.state.free.x },
  'free.y': { id: 'free.y', label: '自由Y', write: 'coord', key: 'y', read: (b) => b.state.free.y },
  'free.z': { id: 'free.z', label: '自由Z', write: 'coord', key: 'z', read: (b) => b.state.free.z },
  'order': { id: 'order', label: '順序', write: 'reorder', read: (b) => b.state.order },
  'col': { id: 'col', label: '列', write: 'cell', key: 'col', read: (b) => b.state.cell.col },
  'row': { id: 'row', label: '行', write: 'cell', key: 'row', read: (b) => b.state.cell.row },
  'history.index': { id: 'history.index', label: '履歴の世代', write: null, read: (b) => b.state.hist },
  // ★ derived 次元は「どの空間の履歴か」を知っている（v2 で踏んだ）
  'history.age': {
    id: 'history.age',
    label: '履歴の古さ',
    write: null,
    read: (b, spaceId, world) => maxHistIn(world, spaceId) - b.state.hist,
  },
  'history.branch': { id: 'history.branch', label: '履歴の枝', write: null, read: (b) => b.state.branch },
};

/** lab.html 364 行。'none' は 'none'、write が無ければ 'focus' */
export function verbOf(dim: DimensionId): Verb {
  return dim === 'none' ? 'none' : (DIMENSIONS[dim].write ?? 'focus');
}

/** DIMENSIONS[dim].read の呼び口（呼ぶ側が DIMENSIONS を引かなくて済むように） */
export function readDimension(
  dim: DimensionId,
  bubble: Bubble,
  spaceId: SpaceId,
  world: BubbleWorld,
): number {
  return DIMENSIONS[dim].read(bubble, spaceId, world);
}

/** その空間の中の最大世代。lab.html 496 行 maxHistIn（'history.age' がこれを読む） */
export function maxHistIn(world: BubbleWorld, spaceId: SpaceId): number {
  return Math.max(0, ...world.kidsOf(spaceId).map((b) => b.state.hist));
}

/** その次元が書き込む泡の id（デバッグ・ヒント用ではなく、書き先を1か所にまとめるため） */
export function writeKeyOf(dim: DimensionId): WriteKey | null {
  return DIMENSIONS[dim].key ?? null;
}
