"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { Space } from "../domain/space.js";
import type { View } from "../domain/view.js";
import { defaultView } from "../domain/view.js";
import { resolveSpace } from "../domain/resolve.js";
import type { Resolved, Viewport } from "../domain/resolve.js";
import { settleSeats } from "../domain/solve.js";
import { findMagnet } from "../domain/magnet.js";
import type { MagnetCandidate } from "../domain/magnet.js";
import { lensById } from "../domain/lens.js";
import { axisMovesBubble } from "../domain/dimension.js";

type DragState = {
  mode: "move" | "resize" | "focus";
  id: string;
  px: number;
  py: number;
  /** 局所倍率。画面の移動量をこれで割ると論理座標の移動量になる（unproject）。 */
  mag: number;
  moved: number;
  /** placed 拘束を持ったまま掴んだ ＝ 動かしたら引き剥がす */
  needsDetach: boolean;
};

export type UseBubbleSpaceOptions = {
  initialSpace: Space;
  initialView?: View;
  /** 近づけると結合が生まれるか */
  magnet?: boolean;
};

export function useBubbleSpace({ initialSpace, initialView, magnet = true }: UseBubbleSpaceOptions) {
  const [space, setSpace] = useState<Space>(initialSpace);
  const [view, setView] = useState<View>(initialView ?? defaultView());
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [viewport, setViewport] = useState<Viewport>({ width: 1200, height: 800 });
  const [hint, setHint] = useState<MagnetCandidate | null>(null);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const spaceRef = useRef(space);
  const resolvedRef = useRef<Resolved | null>(null);
  spaceRef.current = space;

  // ── 画面サイズ ──────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewport({ width: r.width, height: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setViewport({ width: r.width, height: r.height });
    return () => ro.disconnect();
  }, []);

  const resolved = useMemo(
    () => resolveSpace(space, view, viewport),
    [space, view, viewport]
  );
  resolvedRef.current = resolved;

  // ── 席の譲り合い。落ち着くまで1フレームずつ進める ────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const next = settleSeats(space);
      if (next !== space) setSpace(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [space]);

  // ── ドラッグ ─────────────────────────────────
  const endDrag = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    setHint((h) => {
      if (d?.mode === "move" && h) {
        setSpace((s) =>
          s.relate({
            kind: h.kind,
            from: h.hostId,
            to: d.id,
            anchor: h.anchor,
            dz: h.kind === "contains" ? -0.15 : 0,
          })
        );
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      d.px = e.clientX;
      d.py = e.clientY;
      d.moved += Math.abs(dx) + Math.abs(dy);
      // ★ unproject = 画面の移動量 ÷ 局所倍率
      const lx = dx / d.mag;
      const ly = dy / d.mag;

      if (d.mode === "resize") {
        setSpace((s) => {
          const b = s.bubble(d.id);
          return b ? s.resize(d.id, { w: b.ownSize.w + lx, h: b.ownSize.h + ly }) : s;
        });
        return;
      }
      if (d.mode === "focus") {
        setView((v) => ({ ...v, focus: { ...v.focus, x: v.focus.x - lx, y: v.focus.y - ly } }));
        return;
      }

      // 掴んだまま動かしたら、置き場所の拘束を外して、いま見えている場所にそのまま置く
      if (d.needsDetach) {
        if (d.moved < 8) return;
        d.needsDetach = false;
        setSpace((s) => detachInPlace(s, d.id, view, viewport, resolvedRef.current));
        return;
      }

      const xFree = axisMovesBubble(view.axes.x);
      const yFree = axisMovesBubble(view.axes.y);
      setSpace((s) => s.moveBy(d.id, xFree ? lx : 0, yFree ? ly : 0));

      if (magnet && resolvedRef.current) {
        setHint(findMagnet(spaceRef.current, resolvedRef.current, d.id));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging, endDrag, magnet, view, viewport]);

  const startDrag = useCallback(
    (mode: DragState["mode"], id: string, e: ReactPointerEvent) => {
      const p = resolvedRef.current?.byId[id];
      dragRef.current = {
        mode,
        id,
        px: e.clientX,
        py: e.clientY,
        mag: Math.max(p?.scale ?? 1, 0.05),
        moved: 0,
        needsDetach: mode === "move" && !!spaceRef.current.binding(id),
      };
      setDragging(true);
    },
    []
  );

  const onBubblePointerDown = useCallback(
    (id: string, e: ReactPointerEvent<HTMLDivElement>) => {
      setSelectedId(id);
      const xFree = axisMovesBubble(view.axes.x);
      const yFree = axisMovesBubble(view.axes.y);
      startDrag(xFree || yFree ? "move" : "focus", id, e);
    },
    [startDrag, view.axes.x, view.axes.y]
  );
  const onBubbleSelect = useCallback((id: string) => setSelectedId(id), []);
  const onResizePointerDown = useCallback(
    (id: string, e: ReactPointerEvent<HTMLDivElement>) => startDrag("resize", id, e),
    [startDrag]
  );
  const onBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => startDrag("focus", "", e),
    [startDrag]
  );
  const onWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    setView((v) => ({ ...v, focus: { ...v.focus, z: v.focus.z + e.deltaY * 0.004 } }));
  }, []);

  /** ★ 焦点の奥行きは既定で「一番手前の泡」に合わせる。 */
  const focusOnFront = useCallback(() => {
    setView((v) => ({ ...v, focus: { ...v.focus, z: resolvedRef.current?.frontZ ?? 0 } }));
  }, []);
  const focusOn = useCallback((id: string) => {
    const p = resolvedRef.current?.byId[id];
    const b = spaceRef.current.bubble(id);
    if (!p || !b) return;
    setView((v) => ({ ...v, focus: { x: b.free.x, y: b.free.y, z: p.z } }));
  }, []);

  return {
    space, setSpace, view, setView,
    resolved, viewport, containerRef,
    selectedId, setSelectedId,
    magnetHint: hint, dragging,
    onBubblePointerDown, onBubbleSelect, onResizePointerDown, onBackgroundPointerDown, onWheel,
    focusOnFront, focusOn,
  };
}

/** 拘束を外し、いま見えている場所にそのまま置く（引き剥がし） */
function detachInPlace(
  space: Space,
  id: string,
  view: View,
  viewport: Viewport,
  resolved: Resolved | null
): Space {
  const p = resolved?.byId[id];
  if (!p) return space.release(id);
  const lens = lensById(view.lensId);
  const q = lens.unproject(
    p.x + (p.w * p.scale) / 2,
    p.y + (p.h * p.scale) / 2,
    p.z,
    { focus: view.focus, cx: viewport.width / 2, cy: viewport.height / 2, quantize: view.quantize }
  );
  return space.release(id).setFree(id, { x: q.x, y: q.y, z: p.z });
}
