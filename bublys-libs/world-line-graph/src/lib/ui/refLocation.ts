/**
 * 値の所在（RefLocation）の記号と色。2Dインスペクタと3Dビューで**同じ表**を使う。
 *
 * 別々に定義すると、同じ状態が2つの道具で違う色に見える。デバッグ道具どうしが
 * 食い違うのは、片方が嘘をついているのと同じくらい困る。
 */

/** その参照が指す値がいまどこにあるか */
export type RefLocation =
  /** メモリ（Redux の CAS）にある。同期で読める */
  | 'memory'
  /** メモリからは追い出された。IndexedDB にはある（非同期なら読める） */
  | 'idb'
  /** どこにも無い。もう復元できない */
  | 'lost'
  /** 削除マーカー（tombstone） */
  | 'tombstone';

export const LOCATION_MARK: Record<
  RefLocation,
  { mark: string; label: string; color: string }
> = {
  memory: { mark: '\u25ce', label: '\u30e1\u30e2\u30ea', color: '#7ee787' },
  idb: { mark: '\u25cb', label: '\u6c38\u7d9a\u306e\u307f', color: '#d29922' },
  lost: { mark: '\u00d7', label: '\u6d88\u5931', color: '#f85149' },
  tombstone: { mark: '\u2421', label: '\u524a\u9664\u6e08\u307f', color: '#8b949e' },
};

export const LOCATION_ORDER: readonly RefLocation[] = [
  'memory',
  'idb',
  'lost',
  'tombstone',
];
