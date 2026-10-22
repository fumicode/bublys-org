"use client";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * ヘッダー（ステータス／アドレスバー）は**いつも箱の外（上）**に出す。
 * 上に出しきれないとき（universe の上端に着いているとき）は、バブルの側を
 * そのぶん下へずらす。ずらす量がこの hook の返す `shift`。
 *
 * 規則は 3 つ ──
 *  1. ヘッダーの上端が、universe の上端より上に出ない（出ないように**バブルごと**下へずらす）
 *  2. ずれているのは**バーを出している間だけ**。消えたら、そのぶん上に戻って辺にくっつく
 *  3. ヘッダーが**見えている範囲**の上端より上に出るなら、**ヘッダーだけ**をバブルに重ねて
 *     下ろす（`headerDrop`）。バブルは画面の外へ流れてよいが、掴む所は見えていてほしい。
 *     下ろせるのはバブルの下端まで ── 下端まで画面の外へ出たら、ヘッダーも一緒に出ていく
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
  /** ヘッダーだけを下ろす量（バブルの中の座標 px） */
  const [headerDrop, setHeaderDrop] = useState(0);

  /**
   * ヘッダーが越えてはいけない上端 ＝ **このバブルが居る universe の上端**。
   *
   * ★ 見えている範囲（viewport や窓）の上端ではない。バブルは universe の上端を
   *   越えられないが、見えている範囲の外へ出るのは構わない ── 海をスクロールすれば
   *   画面の上へ流れていくのが自然。見えている範囲を基準にしていたときは、
   *   画面の上へ流れたバブルが、ヘッダーを見せようとして画面の中へ押し戻されていた。
   * universe の矩形はスクロールと一緒に動くので、画面の座標のまま比べてよい。
   * 入れ子の中でも、いちばん近い universe（その窓の海）が基準になる。
   */
  const topBound = (): number => {
    const universe = ref.current?.closest("[data-bubble-universe]");
    return universe ? universe.getBoundingClientRect().top : 0;
  };

  /** スクロールする器（universe の親 = 海の見えている範囲） */
  const scroller = (): HTMLElement | null =>
    ref.current?.closest("[data-bubble-universe]")?.parentElement ?? null;

  /** 見えている範囲の上端。ヘッダーはここより上に出たら、バブルに重ねて下ろす（規則 3） */
  const visibleTop = (): number => scroller()?.getBoundingClientRect().top ?? 0;

  const headerHeightNow = (): number =>
    ref.current?.querySelector(headerSelector)?.getBoundingClientRect().height ?? fallbackHeight;

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

  /** いまの位置から、必要なずらし量（バブルごと・ヘッダーだけ）を測り直す */
  const measure = () => {
    const el = ref.current;
    const bubbleRect = el?.getBoundingClientRect();
    if (!el || !bubbleRect) return;
    const headerHeight = headerHeightNow();
    // いまずれているぶんを引いて、素の位置で測る
    const rawTop = bubbleRect.top - appliedShift();
    const next = Math.max(0, topBound() - (rawTop - headerHeight));
    if (!Number.isFinite(next)) return;
    // ★ サブピクセルの差では動かさない。
    //   実測は毎回わずかに違う値（48.3984375 と 48.39843814697266 など）を返すので、
    //   そのまま入れると「値が変わった → 描き直し → また測る」で止まらなくなる。
    setShift((prev) => (Math.abs(prev - next) < SHIFT_EPSILON ? prev : next));

    // 規則 3: ずらし終えた位置で、ヘッダーが見えている範囲の上に出るぶんだけ下ろす。
    // 下ろすのはバブルの下端まで（＝最大でバブルの高さ）。
    // ヘッダーはバブルの中に居るので、画面の px をバブルの縮尺で割って中の px にする。
    const headerTop = rawTop + next - headerHeight;
    const dropOnScreen = Math.min(Math.max(0, visibleTop() - headerTop), bubbleRect.height);
    const scale = el.offsetHeight > 0 ? bubbleRect.height / el.offsetHeight : 1;
    const nextDrop = scale > 0 ? dropOnScreen / scale : 0;
    setHeaderDrop((prev) => (Math.abs(prev - nextDrop) < SHIFT_EPSILON ? prev : nextDrop));
  };

  /**
   * マウスが「バブルの見えている部分の上の辺」の近くにあるか（ヘッダーを出すきっかけ）。
   * 上の辺が画面の外なら、見えている範囲の上端を辺とみなす。そのときヘッダーは
   * 下ろされてバブルに重なるので、ヘッダーの上にいる間も「近く」に数える。
   */
  const isNearTop = (clientY: number, threshold: number): boolean => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return false;
    const top = visibleTop();
    const edge = Math.max(rect.top, top);
    const covered = rect.top < top ? headerHeightNow() : 0;
    return clientY - edge < threshold + covered;
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

  /** 出している間は、海のスクロールでも測り直す（バブルは描き直されないので） */
  useLayoutEffect(() => {
    if (!visible) return;
    const el = scroller();
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    return () => el.removeEventListener("scroll", measure);
  }, [visible]);

  // 出していない間は 0（＝辺にくっついたまま）
  return { shift: visible ? shift : 0, headerDrop: visible ? headerDrop : 0, measure, isNearTop };
}
