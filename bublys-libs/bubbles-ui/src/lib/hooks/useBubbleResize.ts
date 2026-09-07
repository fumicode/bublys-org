"use client";
import { useContext, useEffect, useRef } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import { Layer, type Point2, type Size2 } from "@bublys-org/bubbles-ui-util";
import { Bubble, type ResizeEdge } from "../Bubble.domain.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { updateBubble } from "../state/bubbles-slice.js";

/** どの辺／隅を掴んだか（掴んだ辺の反対側が固定される） */
export type ResizeDirection = ResizeEdge;

type UseBubbleResizeArgs = {
  bubble: Bubble;
  ref: React.RefObject<HTMLElement | null>;
  /** このバブルが属するレイヤー。奥レイヤーは scale で縮小表示されるため変換に必要。 */
  layerIndex?: number;
  /** 奥行きが収束する universe 座標。位置を動かすとき transform-origin の追従に要る。 */
  vanishingPoint?: Point2;
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
export function useBubbleResize({ bubble, ref, layerIndex, vanishingPoint }: UseBubbleResizeArgs) {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const { surfaceLeftTop } = useContext(BubblesContext);

  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;

  // 面が 2 つあることに注意（ここを取り違えると奥のレイヤーでズレる）:
  //  - surface: 位置 ⇄ style.left/top の変換。**常に index 0**（平行移動だけ）。
  //    奥行きの縮小は CSS transform: scale が担当するので、位置に scale を掛けてはいけない。
  //  - depth:   スクリーン上の移動量・実寸 → layer-local への変換。**バブル自身の index**。
  const surfaceLayerRef = useRef<Layer>(new Layer(0, { x: 0, y: 0 }, { x: 0, y: 0 }));
  const depthLayerRef = useRef<Layer>(new Layer(0, { x: 0, y: 0 }, { x: 0, y: 0 }));
  surfaceLayerRef.current = new Layer(
    0,
    surfaceLeftTop ?? { x: 0, y: 0 },
    vanishingPoint ?? { x: 0, y: 0 },
  );
  depthLayerRef.current = surfaceLayerRef.current.atIndex(layerIndex ?? 0);

  const edgeRef = useRef<ResizeEdge>("se");
  const startBubbleRef = useRef<Bubble | null>(null);
  const startMouseRef = useRef<Point2 | null>(null);
  const currentBubbleRef = useRef<Bubble | null>(null);

  /** いまのバブルを DOM に反映する（位置・サイズ・transform-origin をまとめて） */
  const paint = (b: Bubble) => {
    const el = ref.current;
    if (!el || !b.size) return;
    const topLeft = surfaceLayerRef.current.place(b.position);
    const origin = depthLayerRef.current.transformOriginFor(topLeft);
    el.style.left = `${topLeft.x}px`;
    el.style.top = `${topLeft.y}px`;
    el.style.width = `${b.size.width}px`;
    el.style.height = `${b.size.height}px`;
    el.style.transformOrigin = `${origin.x}px ${origin.y}px`;
    el.style.transition = "none";
  };

  const handleResizing = (e: MouseEvent) => {
    if (!startBubbleRef.current || !startMouseRef.current) return;
    const screenDelta = {
      x: e.clientX - startMouseRef.current.x,
      y: e.clientY - startMouseRef.current.y,
    };
    const localDelta = depthLayerRef.current.scaleScreenDelta(screenDelta);
    const next = startBubbleRef.current.resizeByEdge(edgeRef.current, localDelta, MIN_SIZE);
    currentBubbleRef.current = next;
    paint(next);
  };

  const endResize = () => {
    const resized = currentBubbleRef.current;
    if (resized) {
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
    startBubbleRef.current = bubbleRef.current
      .moveTo(surfaceLayerRef.current.locate({
        x: parseFloat(el.style.left || "0") || 0,
        y: parseFloat(el.style.top || "0") || 0,
      }))
      .resizeTo(depthLayerRef.current.scaleScreenSize({ width: rect.width, height: rect.height }));
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
