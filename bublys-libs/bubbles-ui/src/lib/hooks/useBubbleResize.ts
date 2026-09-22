"use client";
import { useContext, useEffect, useRef } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import { Layer, type Point2, type Size2 } from "@bublys-org/bubbles-ui-util";
import { Bubble, type ResizeEdge } from "../Bubble.domain.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { updateBubble } from "../state/bubbles-slice.js";
import { useShowreDock } from "../showre/ShowreDock.js";

/** どの辺／隅を掴んだか（掴んだ辺の反対側が固定される） */
export type ResizeDirection = ResizeEdge;

type UseBubbleResizeArgs = {
  bubble: Bubble;
  ref: React.RefObject<HTMLElement | null>;
  /** このバブルが属するレイヤー。奥レイヤーは scale で縮小表示されるため変換に必要。 */
  layerIndex?: number;
  /** 奥行きが収束する universe 座標。位置を動かすとき transform-origin の追従に要る。 */
  vanishingPoint?: Point2;
  /** 岸に着いている。位置は universe ではなく画面の座標なので、留め直しで確定する */
  docked?: boolean;
};

const MIN_SIZE: Size2 = { width: 160, height: 100 };

/**
 * バブルの辺／隅のリサイズ hook（左・右・下・左下・右下）。
 *
 * ルール: **掴んだ辺の反対側が固定される**。
 *
 * 座標の扱いは {@link Layer}（空間の変換）と {@link Bubble.resizeByEdge}（位置とサイズの
 * 更新規則）に任せ、この hook では scale やオフセットの掛け算・足し算を一切書かない。
 * 手計算していたときは
 *   - `style.left`（universe 座標）に scale を掛けた移動量を書いてしまう
 *   - `bubble.position`（layer-local）が未定義のとき 0 で代用し、確定時に絶対位置へ飛ぶ
 * という取り違えが起きた。起点は必ず「画面に出ている実物（DOM）」から作る。
 */
export function useBubbleResize({ bubble, ref, layerIndex, vanishingPoint, docked = false }: UseBubbleResizeArgs) {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const { surfaceLeftTop } = useContext(BubblesContext);
  const showreDock = useShowreDock();
  const showreDockRef = useRef(showreDock);
  showreDockRef.current = showreDock;

  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;

  // バブルの位置は、どのレイヤーに居ても **universe（surface）座標の 1 つの空間**で持つ
  // （BubblesLayeredView は全バブルを surface レイヤーで place する）。
  // レイヤーが決めるのは**見た目の縮尺**だけなので、場合分けは要らない:
  //   位置 ⇄ style.left/top … universe の面（下の frame）で変換する
  //   画面の移動量 → モデル … その面の縮尺で割る（frame.atIndex(layerIndex)）
  const frameRef = useRef<Layer>(new Layer(0, { x: 0, y: 0 }, { x: 0, y: 0 }));
  frameRef.current = new Layer(0, surfaceLeftTop ?? { x: 0, y: 0 }, vanishingPoint ?? { x: 0, y: 0 });
  /** このバブルの見た目の縮尺を持つ面（画面の移動量・実寸の変換に使う） */
  const scaledFrame = () => frameRef.current.atIndex(layerIndex ?? 0);

  const edgeRef = useRef<ResizeEdge>("se");
  const startBubbleRef = useRef<Bubble | null>(null);
  const startMouseRef = useRef<Point2 | null>(null);
  const currentBubbleRef = useRef<Bubble | null>(null);

  /**
   * 岸に貼ったバブルは**海（画面）より大きくならない**。
   * 逆に言えば、海いっぱいまでは伸ばせる（浮いているときの頭打ちは効かせない）。
   */
  const capToSea = (b: Bubble): Bubble => {
    const sea = showreDockRef.current?.viewport;
    if (!docked || !sea || !b.size || sea.width <= 0 || sea.height <= 0) return b;
    const width = Math.min(b.size.width, sea.width);
    const height = Math.min(b.size.height, sea.height);
    return width === b.size.width && height === b.size.height ? b : b.resizeTo({ width, height });
  };

  /** 岸でのドラッグ中の矩形（画面座標）。掴んだ辺の反対側が固定されるよう、ここで作る */
  const dockedRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const startScreenRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  /** いまのバブルを DOM に反映する（位置・サイズ・transform-origin をまとめて） */
  const paint = (b: Bubble) => {
    const el = ref.current;
    if (!el || !b.size) return;
    el.style.width = `${b.size.width}px`;
    el.style.height = `${b.size.height}px`;
    el.style.transition = "none";
    // 岸では位置は画面の座標。貼った辺は CSS が留めているので、
    // 貼っていない向き（置き場所の left/top）だけを動かす
    if (docked) {
      const slot = el.parentElement;
      const rect = dockedRectRef.current;
      if (!slot || !rect) return;
      if (slot.style.left !== "") slot.style.left = `${rect.x}px`;
      if (slot.style.top !== "") slot.style.top = `${rect.y}px`;
      return;
    }
    const topLeft = frameRef.current.place(b.position);
    const origin = scaledFrame().transformOriginFor(topLeft);
    el.style.left = `${topLeft.x}px`;
    el.style.top = `${topLeft.y}px`;
    el.style.transformOrigin = `${origin.x}px ${origin.y}px`;
  };

  const handleResizing = (e: MouseEvent) => {
    if (!startBubbleRef.current || !startMouseRef.current) return;
    const screenDelta = {
      x: e.clientX - startMouseRef.current.x,
      y: e.clientY - startMouseRef.current.y,
    };
    const localDelta = scaledFrame().scaleScreenDelta(screenDelta);
    // universe の左端（universe 座標 x=0）を layer-local に直して渡す。
    // ドラッグ側は縁でクランプするので、リサイズだけ外に出られると戻れなくなる。
    const universeLeft = frameRef.current.locate({ x: 0, y: 0 }).x;
    const next = capToSea(
      startBubbleRef.current.resizeByEdge(edgeRef.current, localDelta, MIN_SIZE, {
        minX: docked ? undefined : universeLeft,
      }),
    );
    currentBubbleRef.current = next;
    // 岸では「掴んだ辺の反対側が固定」を画面の矩形の上で解く。
    // 貼った辺は CSS が留めているので、ここで動くのは貼っていない向きだけ
    const startRect = startScreenRectRef.current;
    if (docked && startRect && next.size) {
      const dx = startRect.width - next.size.width;
      const dy = startRect.height - next.size.height;
      const movesLeft = edgeRef.current.includes("w");
      const movesTop = edgeRef.current.includes("n");
      dockedRectRef.current = {
        x: movesLeft ? startRect.x + dx : startRect.x,
        y: movesTop ? startRect.y + dy : startRect.y,
        width: next.size.width,
        height: next.size.height,
      };
    }
    paint(next);
  };

  const endResize = () => {
    const resized = currentBubbleRef.current;
    const dockedRect = dockedRectRef.current;
    if (docked && resized && dockedRect) {
      // 岸に留めたまま、矩形だけ変える（大きさはバブル自身が持つ）
      showreDockRef.current?.redock(bubbleRef.current.id, dockedRect);
    } else if (resized) {
      // サイズと位置は 1 回の更新でまとめて確定する（片方だけ先に反映されるとズレる）
      // 「ユーザーがサイズを決めた」状態 = maximized:false を明示的に立てる
      dispatch(updateBubble({ ...resized.toJSON(), maximized: false }, universeId));
    }
    if (ref.current) {
      // transition だけ戻す。位置・サイズのインラインは残して React の再描画に上書きさせる
      //（ここで消すと、React が新しい値を描くまでの 1 フレームだけ元の位置に戻って見える）
      ref.current.style.transition = "";
    }
    startBubbleRef.current = null;
    startMouseRef.current = null;
    currentBubbleRef.current = null;
    dockedRectRef.current = null;
    startScreenRectRef.current = null;
    document.removeEventListener("mousemove", handleResizing);
    document.removeEventListener("mouseup", endResize);
  };

  const onResizeStart = (
    e: {
      clientX: number;
      clientY: number;
      stopPropagation: () => void;
      preventDefault?: () => void;
    },
    edge: ResizeEdge = "se",
  ) => {
    e.stopPropagation();
    e.preventDefault?.();
    const el = ref.current;
    const rect = el?.getBoundingClientRect();
    if (!el || !rect) return;

    edgeRef.current = edge;
    // 起点は「画面に出ている実物」から作る。`style.left/top` は universe 座標、
    // getBoundingClientRect はスクリーン実寸なので、どちらも Layer で layer-local に直す。
    // bubble.position をそのまま起点にすると、未設定のとき {0,0} に化けて位置が飛ぶ。
    const sized = bubbleRef.current.resizeTo(
      scaledFrame().scaleScreenSize({ width: rect.width, height: rect.height }),
    );
    startScreenRectRef.current = docked
      ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      : null;
    dockedRectRef.current = startScreenRectRef.current;
    startBubbleRef.current = docked
      ? sized  // 岸では universe の位置を使わない（画面の矩形で留め直す）
      : sized.moveTo(frameRef.current.locate({
          x: parseFloat(el.style.left || "0") || 0,
          y: parseFloat(el.style.top || "0") || 0,
        }));
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    document.addEventListener("mousemove", handleResizing);
    document.addEventListener("mouseup", endResize);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResizing);
      document.removeEventListener("mouseup", endResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { onResizeStart };
}
