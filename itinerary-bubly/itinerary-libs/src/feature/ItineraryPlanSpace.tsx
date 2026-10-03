'use client';
/**
 * **本計画づくりの場** ── 旅程を真ん中に置いた、パズルの盤。
 *
 * > 真ん中に旅程。まわりに、まだ入っていないもの。
 * > **向きは「どの仲間か」。近さは「どれくらい埋まっているか」。**
 *
 * ★ **ここは OS のユニバースを借りているだけ。** 入れ子の海・自分の見え方の口・
 *   箱での切り取り・岸は、ぜんぶ道具の側が持っている（`UniverseSpace`）。
 *   借りた側が言うのは「**誰が居て、どこに置くか**」だけ。
 *   ── 前はこれを一覧の仕組み（`setChildren` を自分の泡に）でやっていたので、
 *   切り取りも見え方の口も並べ方の書き戻しも、道具が持っているものを
 *   1 つずつ手で作り直すことになっていた。
 * ★ **置き場所そのものが関係を表す。** 並べ方（縦に並べる・奥に重ねる）では
 *   「仲間」と「決まり具合」を同時に見せられないので、自由に置く座標をこちらで書く。
 * ★ **入っているものは浮かばない。** 旅程に入れれば沈み、外せば浮かぶ
 *   ── 顔ぶれは毎回「渡されたもの − 入っているもの」から出す。
 *
 * ★ **この盤は、メモの別の見え方**でもある。だから
 *   「旅程の一覧から外して、盤に浮かせる」は**何も失っていない** ── 盤に居る限り、
 *   もとの 1 件は残っている。
 *   ただし**そのことを道具は知らない** ── 道具にとっては、借りた側が顔ぶれを
 *   言い切る窓、というだけ。
 */
import { FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutRoutesContext,
  useCurrentBubble,
  type BubbleSpaceApi,
} from "@bublys-org/bubble-layout-feature";
import { UniverseSpace } from "@bublys-org/bubble-space-shell";
import { planPositions } from "../domain/planLayout.js";
import { useHandedPieces } from "./useHandedPieces.js";

/** 真ん中に置く旅程の url */
const centerUrl = (itineraryId: string): string => `itineraries/${itineraryId}`;

/**
 * **場の実寸を見張る。**
 *
 * ★ 置き場所は場の大きさから出す（`planLayout`）ので、決め打ちにはできない
 *   ── 人が辺を掴んで広げたら、そのぶん散らばりも広がってほしい。
 * ★ 見るのは**倍率の掛かる前の px**（`offsetWidth`）。画面に写った大きさで測ると、
 *   奥に退いた場では縮んだ数が返ってきて、散らばりが場ごとに変わってしまう。
 */
const useBoxSize = (ref: React.RefObject<HTMLElement | null>) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
};

export const ItineraryPlanSpace: FC<{ itineraryId: string }> = ({ itineraryId }) => {
  const me = useCurrentBubble();
  const routes = useContext(LayoutRoutesContext);
  const pieces = useHandedPieces(itineraryId);

  /**
   * **窓の中の海の口。**
   *
   * ★ **状態に入れない。** 口は窓が描き直されるたびに新しい物になるので、
   *   状態に入れると「受け取る → 状態が変わる → 描き直す → また新しい口」で
   *   回り続ける（実測：`Maximum update depth` が 2.5 秒に 5〜11 回）。
   *   置くのは ref。立ち上がったことだけを 1 度、状態で知らせる。
   */
  const innerRef = useRef<BubbleSpaceApi | null>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback((api: BubbleSpaceApi) => {
    innerRef.current = api;
    setReady(true);
  }, []);
  /** 場の広さ。ここを測った大きさが、そのまま散らばりの入れものになる */
  const boxRef = useRef<HTMLDivElement | null>(null);
  const box = useBoxSize(boxRef);

  const center = centerUrl(itineraryId);
  const spots = useMemo(() => planPositions(pieces, box), [pieces, box]);
  /**
   * **岸に貼られたものは、もう海に居なくてよい。**
   *
   * ★ 顔ぶれを言い切っている場なので、黙っていると**貼った瞬間に海へ生え直して
   *   二重になる**。器は「出て行った」と教えてくれるので、こちらが顔ぶれから外す
   *   ── 外すかどうかを決めるのは持ち主、という決まりのとおり。
   * ★ 人が岸から海へ返したら、また顔ぶれに戻す（器が控えを消すので、次の走りで生える）。
   */
  const [ashore, setAshore] = useState<ReadonlySet<string>>(() => new Set());
  const onLeave = useCallback((url: string, at2: { readonly space: string | null }) => {
    if (at2.space !== null) return; // 海の中で動いただけ（隣へ剥がした等）はここの話ではない
    setAshore((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  const urls = useMemo(
    () => [center, ...pieces.map((p) => p.url)].filter((u) => !ashore.has(u)),
    [center, pieces, ashore],
  );

  /** 真ん中は旅程。ほかは決まりどおりの所へ */
  const at = useCallback(
    (url: string) => (url === center ? { x: 0, y: 0 } : spots.get(url)),
    [center, spots],
  );

  /**
   * **中の海に、顔ぶれと置き場所を言い切る。**
   *
   * ★ 書くのは**この 1 回だけ**。顔ぶれと置き場所を一緒に渡す ── 別々に書くと、
   *   同じ描画のうちに後のほうが前のほうを握り潰す。
   * ★ **測り終えるまで出さない。** 置き場所は場の実寸から出すので、測る前に出すと
   *   全部が真ん中に生まれる（`at` が効くのは生まれるとき 1 回だけ）。
   * ★ **並べ方は言わない。** 自由に置くのは中の海の既定で、そこから先は人のもの
   *   ── 毎回書き戻すと、見え方の口で選んでも次の走りで消える。
   */
  useEffect(() => {
    const inner = innerRef.current;
    if (!ready || !inner || box.w <= 0) return;
    /**
     * ★ **箱の伸び縮み（`grow`）は言わない。** ここは海そのもの（窓の root）で、
     *   箱を持っていない ── 言っても書き込まれないので、器は毎回「まだ違う」と読み、
     *   **書く → 海が変わる → また書く**で回り続ける（実測：2.5 秒で 11 回の
     *   `Maximum update depth`）。
     */
    inner.setChildren("root", urls, { at, list: false, onLeave });
  }, [ready, urls, at, box.w, onLeave]);

  /**
   * ★ **剥がす受け口はここには要らない。** 予定の札を掴んで盤へ出したときに
   *   旅程から外すのは、**旅程の一覧自身**が受け持っている（`ItineraryDetail` の
   *   `onItemLeave`）── 一覧の札が出て行ったことを知っているのは一覧なので。
   *   盤はその結果（浮き直った付箋）を置き直すだけ。
   */
  /**
   * ★ **同じ配列を返す。** 窓はこれをそのまま中の海に渡すので、毎回新しい配列を作ると
   *   中の海が作り直しになり、**描く → 作り直す → 描く**で回り続ける
   *   （実測：`Maximum update depth` が 3 秒に 53 回。顔ぶれを 1 度も書かなくても出た）。
   */
  const getRoutes = useCallback(() => routes, [routes]);

  /** 窓の id は泡の id（url ではない）。立ち上がるまでは何も出さない */
  if (!me) return <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />;

  return (
    <div ref={boxRef} style={{ position: "absolute", inset: 0 }}>
      {/* ★ 種は撒かない ── 顔ぶれは下の `setChildren` が言い切るので、
          両方から出すと同じ url が 2 つ生える */}
      <UniverseSpace id={me} routes={getRoutes} onReady={onReady} />
      {pieces.length === 0 && (
        <div style={noticeStyle}>メモを旅程へ落とすと、入らなかったものがここに浮かびます</div>
      )}
    </div>
  );
};

/** 盤の下に出す一言 */
const noticeStyle = {
  position: "absolute",
  left: "50%",
  bottom: 12,
  transform: "translateX(-50%)",
  padding: "4px 10px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.86)",
  color: "#4a5568",
  font: "11px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: 10,
} as const;
