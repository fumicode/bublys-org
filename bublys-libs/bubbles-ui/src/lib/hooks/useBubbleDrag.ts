"use client";
import { useContext, useEffect, useRef } from "react";
import { Layer, Point2 } from "@bublys-org/bubbles-ui-util";
import { useAppDispatch } from "@bublys-org/state-management";
import { Bubble } from "../Bubble.domain.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { updateBubble, dockToShowre, undockFromShowre } from "../state/bubbles-slice.js";
import { createUniverse } from "../universe-config.js";
import { useShowreDock } from "../showre/ShowreDock.js";
import { nameIntent } from "@bublys-org/world-line-graph";

type UseBubbleDragArgs = {
  bubble: Bubble;
  ref: React.RefObject<HTMLElement | null>;
  layerIndex?: number;
  vanishingPoint?: Point2;
  /** 岸に着いている。ドラッグは位置の移動ではなく、辺の移動 / 引き剥がしになる */
  docked?: boolean;
};

/** これ未満の移動はクリック扱い（岸に着いているときの誤操作防止） */
const CLICK_TOLERANCE = 4;

/** fit-content で大きさが決まっていないバブルの、引き剥がし予告用の仮の大きさ */
const FALLBACK_FLOAT_SIZE = { width: 240, height: 160 };

/**
 * バブル本体（または窓）のヘッダーからのドラッグを担当する hook。
 * BubbleView / UniverseBubbleView で共通。
 *
 * 振る舞い:
 *  - ドラッグ中は DOM 直接操作（left/top + transform-origin）で Redux を回さない
 *  - ドラッグ終了時に 1 回だけ updateBubble を dispatch
 *  - universe 端は createUniverse().clamp() でクランプ
 *
 * 座標は {@link useBubbleResize} と同じ扱いにそろえてある:
 *  - 面は 2 つを名前で分ける（surface = 位置の変換 / depth = 移動量の変換）
 *  - 起点は `bubble.position` ではなく**画面に出ている実物（DOM）**から作る
 *    （position は未設定のとき getter が {0,0} を返すので、掴んだ瞬間に原点へ飛ぶ）
 *  - 移動そのものの規則は集約（{@link Bubble.moveBy}）が持つ
 *
 * 岸（Showre）:
 *  - 辺の近くで離すと、その岸に着く（{@link ShowreDragContext} が辺を判定する）。
 *    ドラッグ中は「ここに着く」帯を見せ、離したときに位置更新のかわりに dockToShowre する。
 *    位置はドラッグ前のまま残るので、引き剥がすと元の場所に戻れる。
 *  - 既に岸に着いているバブル（docked）は DOM を動かさない（帯の並びは flex なので
 *    動かせない）。かわりに予告（辺なら帯、海なら浮く矩形）を見せ、離したときに
 *    辺の移動・並び替え（dockToShowre）か引き剥がし（undockFromShowre）を 1 回だけ行う
 */
export function useBubbleDrag({ bubble, ref, layerIndex, vanishingPoint, docked = false }: UseBubbleDragArgs) {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const { surfaceLeftTop } = useContext(BubblesContext);
  const showreDock = useShowreDock();
  const showreDockRef = useRef(showreDock);
  showreDockRef.current = showreDock;

  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  const layerIndexRef = useRef(layerIndex);
  layerIndexRef.current = layerIndex;

  // バブルの位置は、どのレイヤーに居ても **universe（surface）座標の 1 つの空間**で持つ
  // （BubblesLayeredView は全バブルを surface レイヤーで place する）。
  // レイヤーが決めるのは**見た目の縮尺**だけなので、場合分けは要らない:
  //   位置 ⇄ style.left/top … universe の面（下の frame）で変換する
  //   画面の移動量 → モデル … その面の縮尺で割る（frame.atIndex(layerIndex)）
  const frameRef = useRef<Layer>(new Layer(0, { x: 0, y: 0 }, { x: 0, y: 0 }));
  frameRef.current = new Layer(0, surfaceLeftTop ?? { x: 0, y: 0 }, vanishingPoint ?? { x: 0, y: 0 });
  /** このバブルの見た目の縮尺を持つ面（画面の移動量・実寸の変換に使う） */
  const scaledFrame = () => frameRef.current.atIndex(layerIndex ?? 0);

  const startBubbleRef = useRef<Bubble | null>(null);
  const dragStartMouseRef = useRef<Point2 | null>(null);
  const currentBubbleRef = useRef<Bubble | null>(null);
  const dockedRef = useRef(docked);
  dockedRef.current = docked;
  const movedRef = useRef(false);

  /** 掴んだときのバブルの矩形（画面座標）。岸では DOM が動かないので、これに移動量を足す */
  const startRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  /**
   * いまバブルが**見えている**矩形（画面座標）。
   * ★ 掴んだ点との相対位置はここに入っている ── 貼り付く場所も予告もこれで決める。
   *   カーソルの点を左上にすると、掴んだ場所のぶんだけバブルが飛ぶ（上に跳ねる・予告がずれる）。
   */
  const visualRect = (e: MouseEvent) => {
    const start = startRectRef.current;
    if (dockedRef.current && start && dragStartMouseRef.current) {
      return {
        x: start.x + (e.clientX - dragStartMouseRef.current.x),
        y: start.y + (e.clientY - dragStartMouseRef.current.y),
        width: start.width,
        height: start.height,
      };
    }
    const now = ref.current?.getBoundingClientRect();
    if (now && now.width > 0) return { x: now.x, y: now.y, width: now.width, height: now.height };
    const b = bubbleRef.current;
    const size = b.size ?? (b.isWindowed ? b.defaultSize : FALLBACK_FLOAT_SIZE);
    return { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
  };

  // 岸に貼り付いているとき: DOM は動かさず、予告だけ更新する
  const handleDockedDragging = (e: MouseEvent) => {
    const start = dragStartMouseRef.current;
    const showre = showreDockRef.current;
    if (!start || !showre) return;
    if (!movedRef.current) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < CLICK_TOLERANCE) return;
      movedRef.current = true;
    }
    showre.setPreview(showre.resolve(visualRect(e), { x: e.clientX, y: e.clientY }, bubbleRef.current.id));
  };

  const endDockedDrag = (e: MouseEvent) => {
    const showre = showreDockRef.current;
    if (showre && movedRef.current) {
      const rect = visualRect(e);
      const hit = showre.resolve(rect, { x: e.clientX, y: e.clientY }, bubbleRef.current.id);
      if (hit?.dock) {
        // 貼り直す（別の辺へ・同じ辺の別の場所へ）
        nameIntent(`showre:dock:${hit.dock.edges.join("+")}`);
        dispatch(dockToShowre(
          { bubbleId: bubbleRef.current.id, dock: hit.dock, size: { width: hit.rect.width, height: hit.rect.height } },
          showre.universeId,
        ));
      } else {
        // 剥がして海に浮かせる
        nameIntent("showre:undock");
        // 落とす点はバブルの左上（掴んだ点との相対位置を保つ）
        dispatch(undockFromShowre(
          { bubbleId: bubbleRef.current.id, droppedAt: showre.toUniverse({ x: rect.x, y: rect.y }) },
          showre.universeId,
        ));
      }
    }
    showre?.setPreview(null);
    dragStartMouseRef.current = null;
    movedRef.current = false;
    document.removeEventListener("mousemove", handleDockedDragging);
    document.removeEventListener("mouseup", endDockedDrag);
  };

  const handleDragging = (e: MouseEvent) => {
    if (!startBubbleRef.current || !dragStartMouseRef.current || !ref.current) return;
    const screenDelta = {
      x: e.clientX - dragStartMouseRef.current.x,
      y: e.clientY - dragStartMouseRef.current.y,
    };

    const frame = frameRef.current;
    const moved = startBubbleRef.current.moveBy(scaledFrame().scaleScreenDelta(screenDelta));
    // 「縁から外へ出さない」は Universe の規則。universe 座標で当ててから layer-local に戻す
    const clamped = frame.locate(createUniverse().clamp(frame.place(moved.position)));
    const next = moved.moveTo(clamped);
    currentBubbleRef.current = next;

    const topLeft = frame.place(next.position);
    const origin = scaledFrame().transformOriginFor(topLeft);
    ref.current.style.left = `${topLeft.x}px`;
    ref.current.style.top = `${topLeft.y}px`;
    ref.current.style.transition = "none";
    ref.current.style.transformOrigin = `${origin.x}px ${origin.y}px`;

    // 「いま離したらどうなるか」の予告（岸でも海でも、離したあとの実寸そのまま）
    const showre = showreDockRef.current;
    if (showre) showre.setPreview(showre.resolve(visualRect(e), { x: e.clientX, y: e.clientY }, bubbleRef.current.id));
  };

  const endDrag = (e: MouseEvent) => {
    const showre = showreDockRef.current;
    const hit = showre && currentBubbleRef.current
      ? showre.resolve(visualRect(e), { x: e.clientX, y: e.clientY }, bubbleRef.current.id)
      : null;
    if (hit?.dock && showre) {
      // 貼り付ける: 位置は画面の座標で覚えるので、universe の位置は書かない
      nameIntent(`showre:dock:${hit.dock.edges.join("+")}`);
      dispatch(dockToShowre(
        { bubbleId: bubbleRef.current.id, dock: hit.dock, size: { width: hit.rect.width, height: hit.rect.height } },
        showre.universeId,
      ));
    } else if (currentBubbleRef.current) {
      dispatch(updateBubble(currentBubbleRef.current.toJSON(), universeId));
    }
    showre?.setPreview(null);
    if (ref.current) {
      ref.current.style.transition = "";
      ref.current.style.transformOrigin = "";
    }
    startBubbleRef.current = null;
    dragStartMouseRef.current = null;
    currentBubbleRef.current = null;
    document.removeEventListener("mousemove", handleDragging);
    document.removeEventListener("mouseup", endDrag);
  };

  const onDragStart = (e: { clientX: number; clientY: number; stopPropagation: () => void }) => {
    e.stopPropagation();
    if (dockedRef.current) {
      const r = ref.current?.getBoundingClientRect();
      startRectRef.current = r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
      dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
      movedRef.current = false;
      document.addEventListener("mousemove", handleDockedDragging);
      document.addEventListener("mouseup", endDockedDrag);
      return;
    }
    const el = ref.current;
    if (!el) return;
    // 起点は画面に出ている実物から作る（bubble.position は未設定のとき {0,0} に化ける）
    startBubbleRef.current = bubbleRef.current.moveTo(
      frameRef.current.locate({
        x: parseFloat(el.style.left || "0") || 0,
        y: parseFloat(el.style.top || "0") || 0,
      }),
    );
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    document.addEventListener("mousemove", handleDragging);
    document.addEventListener("mouseup", endDrag);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleDragging);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("mousemove", handleDockedDragging);
      document.removeEventListener("mouseup", endDockedDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { onDragStart };
}
