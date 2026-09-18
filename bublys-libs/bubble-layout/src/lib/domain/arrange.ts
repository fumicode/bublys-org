/**
 * ④ 並べ方 ── 値 → 空間の中での位置（泡の中心。原点は中身の箱の中心）。
 *
 * > 値ごとに帯を作り、帯の中に揃えて置き、塊の中央を空間の中心に置く。
 * > 等間隔と詰めるの違いは、帯の幅の決め方だけ。
 *
 * 元：lab.html 571-615 行（arrangeAxis ＝ 帯の式）と 1325-1333 行（cellFromBands ＝ 帯 → マス）
 *
 * 重ならないことを保証するのは 'pack' だけ。'equal' は中身の大きさを見ない。
 */
import { METRICS } from './types.js';
import type { Axis, BubbleId, SpaceId, Size } from './types.js';
import { readDimension } from './dimension.js';
import type { Bubble } from './bubble.js';
import type { BubbleWorld } from './world.js';
import type { AxisView } from './view.js';
import type { LayoutRules } from './rules.js';

export type ArrangeId = 'as-is' | 'equal' | 'pack';

/** 見出し。lab.html 391 行 ARRANGES */
export const ARRANGES: Readonly<Record<ArrangeId, string>> = {
  'as-is': 'そのまま',
  equal: '等間隔',
  pack: '詰める',
};


/** 帯の中の揃え。効くのは 'pack' だけ（等間隔の帯は泡がいつも中央に来る。lab.html 609-611 行） */
export type Align = 'start' | 'center';

/** ある値の帯。start・end は空間の中での座標 */
export interface Band {
  readonly value: number;
  readonly start: number;
  readonly end: number;
}

/** 1つの軸を並べた答え */
export interface Arranged {
  /** 泡 id → 空間の中での位置（泡の中心） */
  readonly pos: ReadonlyMap<BubbleId, number>;
  /** 値の小さい順。'as-is' では空 */
  readonly bands: readonly Band[];
  /** 塊の中央をどれだけずらしたか（equal の逆写し valueFromPos が使う） */
  readonly mid: number;
  /** この軸で使った隙間（View の軸が持っていればそれ、無ければ METRICS.GAP） */
  readonly gap: number;
}

export interface ArrangeInput {
  readonly axisView: AxisView;
  readonly axis: Axis;
  readonly spaceId: SpaceId;
  /** その空間の中の泡（KIDS の並び順そのまま） */
  readonly kids: readonly Bubble[];
  /** 泡 → 箱の大きさ（measure の答え）。'pack' の帯の幅と 'equal' の塊の端がこれを読む */
  readonly sizeOf: (b: Bubble) => Size;
  /** 次元の read が「その空間の履歴」を見るために要る */
  readonly world: BubbleWorld;
  readonly rules: LayoutRules;
}

/**
 * 1つの軸を並べる。lab.html 571-615 行。
 *
 * - 'as-is' … 値をそのまま px。帯を作らない
 * - 'equal' … 帯の幅は間隔（step）。中身の大きさを見ない。塊の端は rules.equalExtent で決める
 * - 'pack'  … 帯の幅はその値を持つ泡の中で一番大きいもの。隙間（gap）で続ける
 * - Z は中央ぞろえしない（焦点 0 ＝ 手前。lab.html 580-585 行）
 */
export function arrangeAxis(input: ArrangeInput): Arranged {
  const { axisView: A, axis, spaceId, kids, sizeOf, world, rules } = input;
  const val = (b: Bubble) => readDimension(A.dim, b, spaceId, world);
  const len = (b: Bubble) => (axis === 'x' ? sizeOf(b).w : sizeOf(b).h);
  const pos = new Map<BubbleId, number>();
  const bands: Band[] = [];
  const values = [...new Set(kids.map(val))].sort((p, q) => p - q);
  const gap = A.gap ?? METRICS.GAP;      // ④ 隙間は View の軸が持つ（見えない親は 0＝縁が接する）
  let mid = 0;

  if (axis === 'z') {
    // Z は中央ぞろえしない（焦点 0 ＝ 手前）
    for (const b of kids) {
      const v = val(b);
      pos.set(b.id, A.arrange === 'equal' ? v * A.step : A.arrange === 'pack' ? values.indexOf(v) : v);
    }
  } else if (A.arrange === 'as-is') {
    for (const b of kids) pos.set(b.id, val(b));
  } else if (A.arrange === 'equal') {
    // 塊の中央を空間の中心に。塊は pack と同じく泡の端から端（値×間隔は泡の中心なので、中心どうしの中点だと
    // 端の泡の大きさが違うときずれる）
    let lo = Infinity;
    let hi = -Infinity;
    if (rules.equalExtent === 'band') {
      // 帯の端から端で測る版（RULES.md「まだ決めていない 2」のもう一方）
      for (const v of values) {
        lo = Math.min(lo, v * A.step - A.step / 2);
        hi = Math.max(hi, v * A.step + A.step / 2);
      }
    } else {
      for (const b of kids) {
        const c = val(b) * A.step;
        lo = Math.min(lo, c - len(b) / 2);
        hi = Math.max(hi, c + len(b) / 2);
      }
    }
    if (kids.length) mid = (lo + hi) / 2;
    for (const b of kids) pos.set(b.id, val(b) * A.step - mid);
    for (const v of values)
      bands.push({ value: v, start: v * A.step - mid - A.step / 2, end: v * A.step - mid + A.step / 2 });
  } else {
    // pack：値ごとの帯。帯の幅はその値を持つ泡の最大
    let total = -gap;
    const bandLen = new Map<number, number>();
    for (const v of values) {
      const l = Math.max(...kids.filter((b) => val(b) === v).map(len));
      bandLen.set(v, l);
      total += l + gap;
    }
    let at = -Math.max(0, total) / 2;
    for (const v of values) {
      const l = bandLen.get(v) as number;
      bands.push({ value: v, start: at, end: at + l });
      at += l + gap;
    }
    for (const b of kids) {
      const bd = bands.find((x) => x.value === val(b)) as Band;
      // ④ 帯の中の揃えは、隙間と同じく View の軸が持つ値（既定は始端）。
      //   等間隔の帯は「中心が 値×間隔・幅が 間隔」なので、泡はいつも帯の中央に来る ── 揃えが効くのは詰めるだけ
      pos.set(b.id, A.align === 'center' ? (bd.start + bd.end) / 2 : bd.start + len(b) / 2);
    }
  }
  return { pos, bands, mid, gap };
}

/**
 * 位置 → 次元の値（並べ方の逆）。lab.html 851-854 行 valueFromPos。
 * 書ける次元は「自由」だけなので 'as-is' が主。'equal' のときだけ mid と step で戻す。
 */
export function valueFromPos(axisView: AxisView, arranged: Arranged, pos: number): number {
  return axisView.arrange === 'equal' ? (pos + arranged.mid) / axisView.step : pos;
}

/**
 * 位置 → マス。lab.html 1325-1333 行 cellFromBands。
 * 帯（と前後の隙間の半分）に入っていればその値、最後の帯より先なら新しい帯。
 *
 * @param len 落とす泡の、その軸の長さ（新しい帯の start/end に使う）
 */
export function cellFromBands(
  bands: readonly Band[],
  pos: number,
  len: number,
  gap: number = METRICS.GAP,
): Band {
  if (!bands.length) return { value: 0, start: -len / 2, end: len / 2 };
  const first = bands[0];
  const last = bands[bands.length - 1];
  if (pos > last.end + gap / 2)
    return { value: last.value + 1, start: last.end + gap, end: last.end + gap + len };
  if (pos < first.start - gap / 2 && first.value > 0)
    return { value: first.value - 1, start: first.start - gap - len, end: first.start - gap };
  const bd = bands.find((x) => pos <= x.end + gap / 2) ?? last;
  return { value: bd.value, start: bd.start, end: bd.end };
}
