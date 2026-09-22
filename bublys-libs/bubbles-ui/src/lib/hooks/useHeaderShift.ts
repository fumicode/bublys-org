"use client";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * ヘッダー（ステータス／アドレスバー）は**いつも箱の外（上）**に出す。
 * 上に出しきれないとき（画面や窓の上端に着いているとき）は、バブルの側を
 * そのぶん下へずらす。ずらす量がこの hook の返す `shift`。
 *
 * 規則はふたつだけ ──
 *  1. ヘッダーの上端が、見えている範囲の上端より上に出ない（出ないように下へずらす）
 *  2. ずれているのは**バーを出している間だけ**。消えたら、そのぶん上に戻って辺にくっつく
 *
 * だから「ずらす量」は出した瞬間に測り直す。mousemove のような別のきっかけに頼ると、
 * バーだけ出て押し下げが 0 のまま（＝バーが画面の外）という食い違いが起きる。
 * 岸に着いていても海に浮いていても、入れ子の中でも、同じ計算でよい。
 */
type UseHeaderShiftArgs = {
  ref: React.RefObject<HTMLElement | null>;
  /** ヘッダー要素を指すセレクタ */
  headerSelector: string;
  /** まだ測れないときの高さ */
  fallbackHeight: number;
  /** ヘッダーを出しているか。出していない間はずらさない（辺にくっつく） */
  visible: boolean;
};

/** これ未満の差は「同じ」とみなす（実測のサブピクセル揺れで回り続けないように） */
const SHIFT_EPSILON = 0.5;

export function useHeaderShift({ ref, headerSelector, fallbackHeight, visible }: UseHeaderShiftArgs) {
  const [shift, setShift] = useState(0);
  const shiftRef = useRef(shift);
  shiftRef.current = shift;

  /**
   * 「見えている範囲」の上端。
   *
   * universe の中に居るときは、その窓（`main.e-window-content`）の上端。
   * ブラウザの viewport（0）を基準にすると、入れ子の中で上端に着いたバブルの
   * ヘッダーが窓の外に出てクリップされ、掴めなくなる。
   * root universe では該当する祖先が無いので 0（= viewport 上端）。
   */
  const visibleTopBound = (): number => {
    const clip = ref.current?.closest("main.e-window-content");
    return clip ? clip.getBoundingClientRect().top : 0;
  };

  /**
   * いま**実際に効いている**ずらし量（px）。
   *
   * ★ state の `shift` ではなく DOM の transform から読む。
   *   ずらしは 0.15s かけて動くので、state は「行き先」、矩形は「途中」を指す。
   *   行き先を引いて途中の矩形を測ると、足りない分をまた足し…を繰り返し、
   *   ホバーした瞬間にバブルが画面の下へ飛んでいく。
   */
  const appliedShift = (): number => {
    const el = ref.current;
    if (!el) return shiftRef.current;
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    const m = new DOMMatrixReadOnly(t);
    return Number.isFinite(m.m42) ? m.m42 : shiftRef.current;
  };

  /** いまの位置から、必要なずらし量を測り直す */
  const measure = () => {
    const bubbleRect = ref.current?.getBoundingClientRect();
    if (!bubbleRect) return;
    const headerHeight =
      ref.current?.querySelector(headerSelector)?.getBoundingClientRect().height ?? fallbackHeight;
    // いまずれているぶんを引いて、素の位置で測る
    const headerTop = bubbleRect.top - appliedShift() - headerHeight;
    const next = Math.max(0, visibleTopBound() - headerTop);
    if (!Number.isFinite(next)) return;
    // ★ サブピクセルの差では動かさない。
    //   実測は毎回わずかに違う値（48.3984375 と 48.39843814697266 など）を返すので、
    //   そのまま入れると「値が変わった → 描き直し → また測る」で止まらなくなる。
    setShift((prev) => (Math.abs(prev - next) < SHIFT_EPSILON ? prev : next));
  };

  /**
   * バーを出している間は、描き直されるたびに測り直す。
   *
   * ずれる量は「バブルがいまどこに居るか」で決まる ── 貼る辺が変わっても、
   * 大きさが変わっても、海が動いても変わる。特定のきっかけ（ホバーやフォーカス）に
   * 紐付けると、上辺で測った値が下辺に移ったあとも残る、といった取り残しが出る。
   * 答えは不動点（測り直しても同じ値）なので、同じ値なら React が再描画を止める。
   */
  useLayoutEffect(() => {
    if (visible) measure();
  });

  /** ずらしが動き終わってから、もう一度だけ測り直す（途中の値では測らない） */
  useLayoutEffect(() => {
    if (!visible || shift === 0) return;
    const el = ref.current;
    if (!el) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "transform") measure();
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, [shift, visible]);

  // 出していない間は 0（＝辺にくっついたまま）
  return { shift: visible ? shift : 0, measure };
}
