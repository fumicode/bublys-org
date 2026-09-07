"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import { CoordinateSystem, type Point2, type Size2 } from "@bublys-org/bubbles-ui-util";
import { Bubble } from "../Bubble.domain.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { updateBubble } from "../state/bubbles-slice.js";

/**
 * どの辺／隅を掴んだか。`w` を含むときは**左辺を動かす**ので、
 * サイズだけでなく位置も一緒に更新する（掴んだ辺の反対側が固定される）。
 */
export type ResizeDirection = "e" | "w" | "s" | "se" | "sw";

type UseBubbleResizeArgs = {
  bubble: Bubble;
  ref: React.RefObject<HTMLElement | null>;
  /** このバブルが属するレイヤー。奥レイヤーは scale で縮小表示されるため変換に必要。 */
  layerIndex?: number;
  /** 奥行きの消失点。左辺を動かすとき transform-origin を追従させるのに要る。 */
  vanishingPoint?: Point2;
};

const MIN_SIZE: Size2 = { width: 160, height: 100 };

/**
 * バブルの辺／隅のリサイズハンドル用 hook。左・右・下・左下・右下に対応する。
 *
 * 振る舞いは {@link useBubbleDrag} と対称的:
 *  - 開始時にバブルの実サイズ（getBoundingClientRect）を起点として記録
 *  - drag 中は DOM 直接操作で width/height を書き換え（transition off）
 *  - 終了時に 1 回だけ updateBubble を dispatch し、size を確定。
 *    同時に maximized: false を立てて「ユーザーがサイズを決めた」状態に遷移する
 *    （最大化状態だった場合はそれが解除される）
 */
export function useBubbleResize({ bubble, ref, layerIndex, vanishingPoint }: UseBubbleResizeArgs) {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();

  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  const layerIndexRef = useRef(layerIndex);
  layerIndexRef.current = layerIndex;
  const vanishingPointRef = useRef(vanishingPoint);
  vanishingPointRef.current = vanishingPoint;

  // サイズはレイヤーローカル座標で扱う（style.width/height はローカル、bubble.size もローカル）。
  const startSizeRef = useRef<Size2 | null>(null);
  const startMouseRef = useRef<{ x: number; y: number } | null>(null);
  const currentSizeRef = useRef<Size2 | null>(null);
  const directionRef = useRef<ResizeDirection>("se");
  /** 左辺を掴んだときの起点。位置（ローカル）と style.left（画面）の両方を持つ */
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const startLeftPxRef = useRef<number>(0);
  /** 左辺を動かしたぶんのローカル移動量（確定時に位置へ反映する） */
  const posShiftXRef = useRef(0);

  const handleResizing = (e: MouseEvent) => {
    if (!startSizeRef.current || !startMouseRef.current || !ref.current) return;
    // マウス移動は画面座標。奥レイヤーは scale で縮むので、ドラッグと同じ CoordinateSystem の核で
    // 画面 delta → レイヤーローカル delta に変換してからローカルの起点サイズに足す。
    const screenDelta = {
      x: e.clientX - startMouseRef.current.x,
      y: e.clientY - startMouseRef.current.y,
    };
    const coordSystem = CoordinateSystem.fromLayerIndex(layerIndexRef.current || 0);
    const localDelta = coordSystem.transformScreenDeltaToLocal(screenDelta);
    const dir = directionRef.current;
    const start = startSizeRef.current;

    // 掴んだ辺だけを動かす。反対側の辺は動かない（= 左辺を掴んだら右辺が固定）
    let w = start.width;
    if (dir.includes("e")) w = start.width + localDelta.x;
    if (dir.includes("w")) w = start.width - localDelta.x;
    const h = dir.includes("s") ? start.height + localDelta.y : start.height;

    const clampedW = Math.max(MIN_SIZE.width, w);
    const clampedH = Math.max(MIN_SIZE.height, h);
    currentSizeRef.current = { width: clampedW, height: clampedH };

    ref.current.style.width = `${clampedW}px`;
    ref.current.style.height = `${clampedH}px`;
    ref.current.style.transition = "none";

    if (dir.includes("w")) {
      // 実際に縮んだ/伸びたぶんだけ左辺を動かす。MIN で止まったときも右辺がずれない。
      //
      // style.left は **CSS transform で拡大縮小される前**の座標系（style.width と同じ）。
      // 奥のレイヤーは scale で縮んで見えるだけなので、ここで scale を掛けてはいけない。
      // 掛けると、ドラッグ中の見た目（scale 倍の移動）と確定後の位置（等倍）がずれ、
      // 手を離した瞬間にバブルが横に飛ぶ。
      const shift = start.width - clampedW;
      posShiftXRef.current = shift;
      const newLeft = startLeftPxRef.current + shift;
      ref.current.style.left = `${newLeft}px`;

      // 奥のレイヤーは消失点を原点に scale されている。left を動かしたら
      // transform-origin も追従させないと、拡大縮小の基準がずれて見た目が横に流れ、
      // 手を離した瞬間に確定位置へ「がくっ」と飛ぶ（ドラッグ側と同じ扱い）。
      const origin = CoordinateSystem.fromLayerIndex(layerIndexRef.current || 0)
        .withVanishingPoint(vanishingPointRef.current || { x: 0, y: 0 })
        .calculateTransformOrigin({ x: newLeft, y: parseFloat(ref.current.style.top || "0") || 0 });
      ref.current.style.transformOrigin = `${origin.x}px ${origin.y}px`;
    }
  };

  const endResize = () => {
    if (currentSizeRef.current) {
      let resized = bubbleRef.current.resizeTo(currentSizeRef.current);
      // 左辺を掴んでいたら、縮んだぶん位置も動かす（右辺を固定するための対）
      if (posShiftXRef.current !== 0 && startPosRef.current) {
        resized = resized.moveTo({
          x: startPosRef.current.x + posShiftXRef.current,
          y: startPosRef.current.y,
        });
      }
      // 「ユーザーがサイズを決めた」状態 = maximized:false を明示的に立てる
      dispatch(updateBubble({ ...resized.toJSON(), maximized: false }, universeId));
    }
    if (ref.current) {
      ref.current.style.transition = "";
      ref.current.style.width = "";
      ref.current.style.height = "";
      ref.current.style.left = "";
      ref.current.style.transformOrigin = "";
    }
    startSizeRef.current = null;
    startMouseRef.current = null;
    currentSizeRef.current = null;
    startPosRef.current = null;
    posShiftXRef.current = 0;
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
    direction: ResizeDirection = "se",
  ) => {
    e.stopPropagation();
    e.preventDefault?.();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    directionRef.current = direction;
    posShiftXRef.current = 0;
    startPosRef.current = bubbleRef.current.position ?? { x: 0, y: 0 };
    startLeftPxRef.current = parseFloat(ref.current?.style.left || "0") || 0;
    // getBoundingClientRect は画面座標（scale 後）。style.width/height はローカル座標なので、
    // scale で割ってローカルの起点サイズにそろえる（奥レイヤーで scale<1 のときズレないように）。
    const { scale } = CoordinateSystem.fromLayerIndex(layerIndexRef.current || 0);
    startSizeRef.current = { width: rect.width / scale, height: rect.height / scale };
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
