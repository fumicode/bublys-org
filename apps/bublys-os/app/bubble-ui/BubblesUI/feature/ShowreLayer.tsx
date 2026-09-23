"use client";
/**
 * 岸（Showre）── 泡のならべかたの上に載せた版。
 *
 * 規則は前と同じ:
 *   - 岸は海の外のエリアではない。海に**重なる層**で、海の大きさは 1px も削らない
 *   - 貼り付いたバブルは**並べ方の外**に出る（海の泡ではなくなる）。位置は画面の座標
 *   - 貼り付いたバブルは**装飾を持たない**。中身だけが管の内側に収まる
 *   - 貼り付いたバブルどうしは重ならない。後から来た方が、落とした点の入る空き区間に
 *     収まるまで縮む
 *   - 管は 1 本の網。海の縁も、貼り付いたバブルのまわりも、1 枚にまとめて描く
 *
 * 新しい海との境目はここだけ ── **離したときに横取りする**（`claim`）。
 * 横取りしたら、その泡は海から出る（`BubbleSpace.onTakeOut`）。
 */
import { FC, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useMemo, useRef } from "react";
import {
  ShowreTubes,
  TUBE_THICKNESS,
  anchoredRect,
  edgesNear,
  fitAmongDocked,
  slotStyle,
  snapToViewport,
  touchingEdges,
  type DockState,
  type ScreenRect,
  type ShowreSide,
  type ShowreTubeOutline,
} from "@bublys-org/bubbles-ui";

/** 岸に着いているもの 1 つ。url と留め方だけ持つ（大きさは貼ったときのもの） */
export type Docked = {
  readonly key: string;
  readonly url: string;
  readonly dock: DockState;
  readonly size: { readonly width: number; readonly height: number };
};

export type ShowreLayerProps = {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly docked: readonly Docked[];
  /** 貼り付いたバブルの中身。海に浮いているときと同じ画面を描く */
  readonly renderContent: (d: Docked) => ReactNode;
  /** 岸から剥がす（海へ戻す） */
  readonly onUndock: (key: string) => void;
  /** 岸の上で動かした／大きさを変えた */
  readonly onUpdate: (key: string, next: { dock: DockState; size: { width: number; height: number } }) => void;
  /** 「いま離したらここに着く」の予告（画面の座標）。無ければ出さない */
  readonly preview?: ScreenRect | null;
};

/**
 * 「いま離したら岸に着くか」を解く。着くなら留め方を返す。
 * どの辺に寄せたかは**カーソル**、置く場所は**バブルが見えている矩形**で決める
 * （掴んだ点との相対位置を保つ）。重なりの解決はドメイン（fitAmongDocked）。
 */
export const resolveDock = (
  rect: ScreenRect,
  pointer: { x: number; y: number },
  viewport: { width: number; height: number },
  others: readonly ScreenRect[],
): { dock: DockState; size: { width: number; height: number } } | null => {
  const edges = edgesNear(pointer, viewport);
  if (edges.length === 0) return null;
  const size = { width: rect.width, height: rect.height };
  const fitted = fitAmongDocked({ edges, at: { x: rect.x, y: rect.y } }, size, viewport, others, pointer);
  if (!fitted) return null;
  const snapped = snapToViewport(fitted, viewport);
  return {
    dock: { edges, at: { x: snapped.x, y: snapped.y } },
    size: { width: snapped.width, height: snapped.height },
  };
};

/** 辺の役割 ── 固定された辺を掴めば動く。自由な辺を掴めば伸び縮みする */
const CURSOR: Record<ShowreSide, string> = { top: "ns-resize", bottom: "ns-resize", left: "ew-resize", right: "ew-resize" };
const SIDES: readonly ShowreSide[] = ["top", "right", "bottom", "left"];
/** 辺の帯の太さ（管と同じ） */
const GRIP = TUBE_THICKNESS;

export const ShowreLayer: FC<ShowreLayerProps> = ({ viewport, docked, renderContent, onUndock, onUpdate, preview }) => {
  /** 掴んでいるもの。動かす／伸び縮みのどちらも、画面の矩形の上で解く */
  const grab = useRef<null | {
    key: string; side: ShowreSide; move: boolean;
    from: { x: number; y: number }; rect: ScreenRect; dock: DockState;
  }>(null);

  const onGripDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, d: Docked, side: ShowreSide, move: boolean) => {
      e.stopPropagation();
      // ★ 先に掴んだことを覚える。捕捉（setPointerCapture）は失敗しうるので後
      grab.current = {
        key: d.key, side, move,
        from: { x: e.clientX, y: e.clientY },
        rect: anchoredRect(d.dock, d.size, viewport),
        dock: d.dock,
      };
      try {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        // 捕捉できなくても掴めている（合成の入力など）
      }
    },
    [viewport],
  );

  const onGripMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const g = grab.current;
      if (!g) return;
      const dx = e.clientX - g.from.x;
      const dy = e.clientY - g.from.y;
      if (g.move) {
        // 固定された辺を掴んだ ── 岸の上を滑る（貼った辺は動かない）
        onUpdate(g.key, {
          dock: { edges: g.dock.edges, at: { x: g.rect.x + dx, y: g.rect.y + dy } },
          size: { width: g.rect.width, height: g.rect.height },
        });
        return;
      }
      // 自由な辺を掴んだ ── 掴んだ辺の反対側が固定されるように、矩形を変える
      const next = { ...g.rect };
      if (g.side === "right") next.width = Math.max(120, g.rect.width + dx);
      if (g.side === "bottom") next.height = Math.max(80, g.rect.height + dy);
      if (g.side === "left") { next.width = Math.max(120, g.rect.width - dx); next.x = g.rect.x + (g.rect.width - next.width); }
      if (g.side === "top") { next.height = Math.max(80, g.rect.height - dy); next.y = g.rect.y + (g.rect.height - next.height); }
      onUpdate(g.key, {
        dock: { edges: g.dock.edges, at: { x: next.x, y: next.y } },
        size: { width: Math.min(next.width, viewport.width), height: Math.min(next.height, viewport.height) },
      });
    },
    [onUpdate, viewport],
  );

  const onGripUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const g = grab.current;
      grab.current = null;
      if (!g || !g.move) return;
      // 縁から遠くまで引いたら、岸から剥がして海へ返す
      if (edgesNear({ x: e.clientX, y: e.clientY }, viewport).length === 0) onUndock(g.key);
    },
    [onUndock, viewport],
  );

  const rects = useMemo(
    () => docked.map((d) => ({ key: d.key, rect: anchoredRect(d.dock, d.size, viewport) })),
    [docked, viewport],
  );

  // 管は 1 枚にまとめて描く。海の縁と、貼り付いたバブルのまわりを、1 本の網として
  const outlines: ShowreTubeOutline[] = useMemo(
    () => [
      { rect: { x: 0, y: 0, width: viewport.width, height: viewport.height } },
      ...rects.map(({ rect }) => ({
        rect,
        // 管を引くかどうかは**いま接している辺**で決まる（留め方ではない）
        joined: touchingEdges(rect, viewport),
        // 光はアプリの中に入れない
        keepOut: {
          x: rect.x + TUBE_THICKNESS,
          y: rect.y + TUBE_THICKNESS,
          width: Math.max(0, rect.width - TUBE_THICKNESS * 2),
          height: Math.max(0, rect.height - TUBE_THICKNESS * 2),
        },
      })),
    ],
    [rects, viewport],
  );

  return (
    <>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
        {docked.map((d) => (
          <div
            key={d.key}
            data-docked-url={d.url}
            style={{ position: "absolute", pointerEvents: "auto", ...slotStyle(d.dock, viewport, d.size) }}
          >
            {/* 岸に着いたバブルは装飾を持たない。中身だけが管の内側に収まる */}
            <div
              style={{
                width: d.size.width,
                height: d.size.height,
                padding: TUBE_THICKNESS,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "auto",
                  background: "linear-gradient(180deg,#ffffff 0%,#f7f8fb 100%)",
                  color: "#1b2029",
                  font: "13px/1.6 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif",
                }}
              >
                {renderContent(d)}
              </div>
            </div>
            {/* 辺の役割は 2 つだけ ──
                **固定された辺を掴めば動く（引き離せば剥がれる）。自由な辺を掴めば伸び縮みする。**
                取っ手という装飾は無く、辺そのものが取っ手（＝管の上） */}
            {SIDES.map((side) => {
              const glued = d.dock.edges.includes(side);
              const along = side === "top" || side === "bottom";
              return (
                <div
                  key={side}
                  data-showre-grip={side}
                  title={glued ? "岸の上で動かす（引き離すと剥がれる）" : "大きさを変える"}
                  onPointerDown={(e) => onGripDown(e, d, side, glued)}
                  onPointerMove={onGripMove}
                  onPointerUp={onGripUp}
                  onPointerCancel={onGripUp}
                  style={{
                    position: "absolute",
                    cursor: glued ? "move" : CURSOR[side],
                    ...(along
                      ? { left: 0, right: 0, height: GRIP, [side]: 0 }
                      : { top: 0, bottom: 0, width: GRIP, [side]: 0 }),
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* 予告 ── 離したあとの実寸そのまま。岸でも海でも同じ規則で描く */}
      {preview && (
        <div
          data-showre-preview=""
          style={{
            position: "absolute", pointerEvents: "none", boxSizing: "border-box", zIndex: 6,
            left: preview.x, top: preview.y, width: preview.width, height: preview.height,
            borderRadius: 16, border: "2px dashed rgba(255,255,255,.75)",
            background: "rgba(255,255,255,.12)", boxShadow: "0 8px 24px rgba(0,0,0,.25)",
          }}
        />
      )}
      <ShowreTubes viewport={viewport} outlines={outlines} />
    </>
  );
};
