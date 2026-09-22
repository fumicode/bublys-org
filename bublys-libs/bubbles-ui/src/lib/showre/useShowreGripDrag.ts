"use client";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import { nameIntent } from "@bublys-org/world-line-graph";
import type { Point2, Size2 } from "@bublys-org/bubbles-ui-util";
import type { Bubble } from "../Bubble.domain.js";
import { dockToShowre, undockFromShowre } from "../state/bubbles-slice.js";
import { dropPointToUniverse } from "../utils/drop-point.js";
import { useShowreDrag } from "./ShowreDragContext.js";

/** これ未満の移動はクリック扱い（何もしない） */
const CLICK_TOLERANCE = 4;

/** fit-content で大きさが決まっていないバブルの、予告用の仮の大きさ */
const FALLBACK_FLOAT_SIZE: Size2 = { width: 240, height: 160 };

/** 浮いたときの大きさの見込み: 手で決めたサイズ → 窓型なら既定サイズ → 仮 */
const floatSizeOf = (bubble: Bubble): Size2 =>
  bubble.size ?? (bubble.isWindowed ? bubble.defaultSize : FALLBACK_FLOAT_SIZE);

/**
 * 岸に着いたバブルのつまみのドラッグ。
 *
 * ルール:
 *  - 辺の近く（または既にある帯の上）で離す → その岸に着く（辺の移動 / 並び替え）
 *  - 海の中で離す → そこに浮く（引き剥がし）
 *
 * ドラッグ中は状態を変えない（変えるとつまみの要素が別の帯に移って pointer capture が
 * 切れる）。かわりに {@link ShowreDragContext} の previewSide で「ここに着く」帯、
 * previewFloat で「ここに浮く」矩形を見せ、離したときに 1 回だけ dispatch する。
 */
export const useShowreGripDrag = (bubble: Bubble) => {
  const bubbleId = bubble.id;
  const dispatch = useAppDispatch();
  const drag = useShowreDrag();
  const [isDragging, setIsDragging] = useState(false);
  // 掴んでいるかは ref で見る（state だと pointerdown 直後の move が古い closure を掴む）
  const startRef = useRef<Point2 | null>(null);
  const movedRef = useRef(false);

  const finish = useCallback(() => {
    startRef.current = null;
    movedRef.current = false;
    setIsDragging(false);
    drag?.setPreviewSide(null);
    drag?.setPreviewFloat(null);
  }, [drag]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 合成イベント等で pointerId が無効なときは捕捉なしで続ける
    }
    startRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    setIsDragging(true);
  }, [drag]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const start = startRef.current;
    if (!start || !drag) return;
    if (!movedRef.current) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) < CLICK_TOLERANCE) return;
      movedRef.current = true;
    }
    const point = { x: e.clientX, y: e.clientY };
    const side = drag.sideNear(point);
    drag.setPreviewSide(side ?? null);
    // 辺の近くでなければ海に浮く。左上が落とした点に来る
    drag.setPreviewFloat(side ? null : { point, size: floatSizeOf(bubble) });
  }, [drag, bubble]);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!startRef.current || !drag) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!movedRef.current) {
      finish();
      return;
    }
    const point = { x: e.clientX, y: e.clientY };
    const side = drag.sideNear(point);
    if (side) {
      nameIntent(`showre:dock:${side}`);
      dispatch(dockToShowre(
        { bubbleId, side, index: drag.indexOnSide(side, point, bubbleId) },
        drag.universeId,
      ));
    } else {
      nameIntent("showre:undock");
      dispatch(undockFromShowre(
        { bubbleId, droppedAt: dropPointToUniverse(point, drag.seaElement()) },
        drag.universeId,
      ));
    }
    finish();
  }, [bubbleId, dispatch, drag, finish]);

  // ウィンドウ外で離した等で pointerup が来ないままキャプチャが外れたら、掴んだ状態を解く
  const onLostPointerCapture = useCallback(() => {
    if (startRef.current) finish();
  }, [finish]);

  return {
    isDragging,
    gripProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture,
    },
  };
};
