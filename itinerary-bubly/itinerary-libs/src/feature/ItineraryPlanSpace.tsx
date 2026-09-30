'use client';
/**
 * **本計画づくりの場** ── 旅程を真ん中に置いた、パズルの盤。
 *
 * > 真ん中に旅程。まわりに、まだ入っていないもの。
 * > **向きは「どの仲間か」。近さは「どれくらい埋まっているか」。**
 *
 * ★ **置き場所そのものが関係を表す。** 並べ方（縦に並べる・奥に重ねる）では
 *   「仲間」と「決まり具合」を同時に見せられないので、自由に置く座標を
 *   こちらで書く（`setChildren` の `at`）。
 * ★ **入っているものは浮かばない。** 旅程に入れれば沈み、外せば浮かぶ
 *   ── 顔ぶれは毎回「渡されたもの − 入っているもの」から出す。
 * ★ ここは 1 つの空間（泡の中の海）。外の海には何も散らからない。
 *
 * ★ **この盤は、メモの別の見え方**でもある。だから
 *   「旅程の一覧から外して、盤に浮かせる」は**何も失っていない** ── 盤に居る限り、
 *   もとの 1 件は残っている。予定の札をここへ落とすのが、その操作
 *   （ボタンの ↩ と同じことを、掴んで出すやり方でできる）。
 * ★ **外の海へ持ち出すのは別の話。** そちらは今までどおり「外に 1 つ増えるだけで、
 *   ここからは減らない」── ほかの一覧と同じ振る舞い。
 */
import {
  DragEvent as ReactDragEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBubbleSpace, useCurrentBubble } from "@bublys-org/bubble-layout-feature";
import {
  anyObjectDragType,
  extractIdFromUrl,
  getDragType,
  parseDragPayload,
} from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { planPositions } from "../domain/planLayout.js";
import { selectItineraryById, updateItinerary } from "../slice/itinerary-slice.js";
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
  const space = useBubbleSpace();
  const me = useCurrentBubble();
  const dispatch = useAppDispatch();
  const itinerary = useAppSelector(selectItineraryById(itineraryId));
  const pieces = useHandedPieces(itineraryId);
  const [dragOver, setDragOver] = useState(false);
  /** 剥がせなかったときに、なぜかを一瞬だけ言う */
  const [refused, setRefused] = useState<string | null>(null);

  const center = centerUrl(itineraryId);

  /** 場の地。ここを測った大きさが、そのまま散らばりの入れものになる */
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const box = useBoxSize(surfaceRef);

  const spots = useMemo(() => planPositions(pieces, box), [pieces, box]);
  const urls = useMemo(() => [center, ...pieces.map((p) => p.url)], [center, pieces]);

  /** 真ん中は旅程。ほかは決まりどおりの所へ */
  const at = useCallback(
    (url: string) => (url === center ? { x: 0, y: 0 } : spots.get(url)),
    [center, spots],
  );

  /**
   * ★ 世界に書くのは**この 1 回だけ**（`ListSpace` と同じ決まり）。
   *   顔ぶれと置き場所を一緒に渡す ── 別々に書くと、同じ描画のうちに
   *   後のほうが前のほうを握り潰す。
   * ★ **箱は伸ばさない**。盤の広さは人のもの。
   */
  useEffect(() => {
    /**
     * ★ **一覧ではない**（`list: false`）。ここは置き場所そのものに意味がある盤なので、
     *   並べ方の口は出さない ── 出すと「縦に並べる」を選べてしまい、
     *   自分で書いた座標と喧嘩する。
     *   ついでに、子が帯（掴む所）を持ったままになるので**動かせる**。
     */
    /**
     * ★ **測り終えるまで出さない。** 置き場所は場の実寸から出すので、
     *   測る前に出すと全部が真ん中に生まれる ── `at` が効くのは**生まれるとき**だけなので、
     *   あとから寸法が分かっても散らばらない。
     */
    if (me && box.w > 0) space.setChildren(me, urls, { preset: "free", at, grow: false, list: false });
  }, [me, space, urls, at, box.w]);

  /**
   * **予定の札をここへ落としたら、旅程から剥がす。**
   *
   * ★ 剥がせるのは**もとがあるもの**だけ（メモから来た予定）。もとが無いものは、
   *   旅程から外すと行き先が無い ── **消えるのと同じ**なので、ここでは受けない。
   *   受けないことを黙っていると壊れて見えるので、その場で理由を言う。
   */
  const canAccept = useCallback(
    (e: ReactDragEvent) => anyObjectDragType(e) === getDragType("ItineraryItem"),
    [],
  );

  const onDrop = useCallback(
    (e: ReactDragEvent) => {
      setDragOver(false);
      if (!itinerary || !canAccept(e)) return;
      const payload = parseDragPayload(e, { acceptTypes: [getDragType("ItineraryItem")] });
      const itemId = payload?.url ? extractIdFromUrl(payload.url) : undefined;
      if (!itemId) return;
      const item = itinerary.findItem(itemId);
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      if (!item.from) {
        setRefused("この予定にはもとが無いので、剥がすと消えてしまいます");
        window.setTimeout(() => setRefused(null), 2600);
        return;
      }
      dispatch(updateItinerary(itinerary.withoutItem(itemId).toPlain()));
    },
    [itinerary, canAccept, dispatch],
  );

  /** 盤の地。落とす先であり、案内を出す所でもある */
  const surface = (
    <div
      ref={surfaceRef}
      data-plan-surface=""
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 10,
        boxShadow: dragOver ? "inset 0 0 0 3px #1f6fd0" : undefined,
        background: dragOver ? "rgba(31,111,208,0.06)" : undefined,
      }}
      onDragOver={(e) => {
        if (!canAccept(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragOver(false);
      }}
      onDrop={onDrop}
    />
  );

  /**
   * 何も渡されていないときの案内。**空の盤を黙って見せない**
   * ── どうすればここに何か来るのかを、その場で言う。
   */
  return (
    <>
      {surface}
      {refused && (
        <div style={{ ...noticeStyle, background: "rgba(192,57,43,0.92)", color: "#fff" }}>{refused}</div>
      )}
      {pieces.length === 0 && (
        <div style={noticeStyle}>
          メモをここへ落とすと、入らなかったものがまわりに浮かびます
        </div>
      )}
    </>
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
} as const;
