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
 *   - 管は 1 本の網。海の縁も、貼り付いたバブルのまわりも、1 枚にまとめて描く。
 *     付け根の通し方は 2 通り（`join`）── **枝分かれ**（岸をまっすぐ走り T 字になる）と
 *     **迂回**（泡の枠へ回り込み、泡と画面の縁の間は通らない）
 *
 * 新しい海との境目はここだけ ── **離したときに横取りする**（`claim`）。
 * 横取りしたら、その泡は海から出る（`BubbleSpace.onTakeOut`）。
 */
import { FC, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useMemo, useRef, useState } from "react";
import {
  ShowreTubes,
  TUBE_THICKNESS,
  SHOWRE_MIN_SIZE,
  anchoredRect,
  clampMoveAmongDocked,
  clampResizeAmongDocked,
  detourCuts,
  edgesNear,
  fitAmongDocked,
  slotStyle,
  snapToViewport,
  touchingEdges,
  type DockState,
  type ScreenRect,
  type ShowreSide,
  type ShowreTubeOutline,
  type TubeJoin,
} from "@bublys-org/bubbles-ui";

/** 岸に着いているもの 1 つ。url と留め方だけ持つ（大きさは貼ったときのもの） */
export type Docked = {
  readonly key: string;
  readonly url: string;
  readonly dock: DockState;
  readonly size: { readonly width: number; readonly height: number };
  /**
   * 地の種類。海に浮いているときと同じものを敷く ──
   * **岸に着いても中身の見た目は変わらない**（変わるのは置き場所だけ）。
   */
  readonly ground?: "light" | "clear";
};

/**
 * 地 2 つ。泡の中（`space-css` の `.bl-body` / `.bl-body.bl-clear`）と同じもの。
 * 岸に着いた泡は `.bub` の外に出るので、同じ地をこちらでも敷く。
 */
const GROUND = {
  // 普通の中身 ── バブリの画面は明るい地を前提に書かれている
  light: {
    background: "linear-gradient(180deg,#ffffff 0%,#f7f8fb 100%)",
    color: "#1b2029",
    overflow: "auto" as const,
  },
  // 窓（空間を持つ泡）── 自分の夜空を持っている。明るい地を敷くと中身が白く霞む
  clear: {
    background: "linear-gradient(145deg,hsl(220 35% 16%) 0%,hsl(225 40% 19%) 40%,hsl(230 35% 17%) 100%)",
    color: "#e6ebf5",
    overflow: "hidden" as const,
  },
};

export type ShowreLayerProps = {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly docked: readonly Docked[];
  /** 貼り付いたバブルの中身。海に浮いているときと同じ画面を描く */
  readonly renderContent: (d: Docked) => ReactNode;
  /** 岸から剥がす（海へ戻す）。`rect` は**剥がした瞬間に見えていた矩形**（そこへ返す） */
  readonly onUndock: (key: string, rect: ScreenRect) => void;
  /** 岸の上で動かした／大きさを変えた */
  readonly onUpdate: (key: string, next: { dock: DockState; size: { width: number; height: number } }) => void;
  /** 「いま離したらここに着く」の予告（画面の座標）。無ければ出さない */
  readonly preview?: ScreenRect | null;
  /** 貼り付いた泡の所で管をどう通すか（見た目だけ。挙動は変わらない） */
  readonly join?: TubeJoin;
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

/**
 * 中身を囲む余白 ── **管が走る辺にだけ空ける**。
 *
 * 余白は「管のぶん」であって飾りではない。迂回では貼った辺に管が走らないので、
 * そこに余白を残すと中身が端から浮いた黒い帯になる。走らない辺は 0 にして、
 * 中身をそのぶん端へ寄せる。
 */
const insetFor = (edges: readonly ShowreSide[], join: TubeJoin) => {
  const none = (side: ShowreSide) => join === "detour" && edges.includes(side);
  return {
    top: none("top") ? 0 : TUBE_THICKNESS,
    right: none("right") ? 0 : TUBE_THICKNESS,
    bottom: none("bottom") ? 0 : TUBE_THICKNESS,
    left: none("left") ? 0 : TUBE_THICKNESS,
  };
};

/**
 * 海の枠の、角の丸み。**迂回で角を占めている泡がある角だけ、丸みを外す。**
 *
 * 迂回ではその角に管が走らず、泡の中身がそのまま角まで出る。枠の丸み（＝切り抜き）を
 * 残したままだと、アプリの中身のほうが角丸に削られてしまう。
 * 枝分かれのときは角にも管が走るので、丸みはそのまま。
 */
export const seaCornerRadius = (
  docked: readonly Docked[],
  viewport: { width: number; height: number },
  join: TubeJoin,
  radius: number,
): { borderTopLeftRadius: number; borderTopRightRadius: number; borderBottomRightRadius: number; borderBottomLeftRadius: number } => {
  const square = { tl: false, tr: false, br: false, bl: false };
  if (join === "detour") {
    for (const d of docked) {
      const e = touchingEdges(anchoredRect(d.dock, d.size, viewport), viewport);
      if (e.includes("top") && e.includes("left")) square.tl = true;
      if (e.includes("top") && e.includes("right")) square.tr = true;
      if (e.includes("bottom") && e.includes("right")) square.br = true;
      if (e.includes("bottom") && e.includes("left")) square.bl = true;
    }
  }
  return {
    borderTopLeftRadius: square.tl ? 0 : radius,
    borderTopRightRadius: square.tr ? 0 : radius,
    borderBottomRightRadius: square.br ? 0 : radius,
    borderBottomLeftRadius: square.bl ? 0 : radius,
  };
};

export const ShowreLayer: FC<ShowreLayerProps> = ({
  viewport,
  docked,
  renderContent,
  onUndock,
  onUpdate,
  preview,
  join = "branch",
}) => {
  /**
   * いま相手にしているもの。
   *
   * 岸に着いたものどうしは**縁を共有する**（管が 1 本に見える所まで重なる）ので、
   * その線を掴んだだけでは「どちらの辺か」が決まらない。決め方はひとつ:
   *
   * > **カーソルが入ってきた側のもの**を相手にする。
   *
   * 共有している線は両方の中に居るが、そこへ来るにはどちらかの体を通ってくるので、
   * 通ってきたほうが先に「入った」と言う。そのまま最後に触ったものが相手であり続ける。
   */
  const [active, setActive] = useState<string | null>(null);

  /** 掴んでいるもの。動かす／伸び縮みのどちらも、画面の矩形の上で解く */
  const grab = useRef<null | {
    key: string; side: ShowreSide; move: boolean;
    from: { x: number; y: number }; rect: ScreenRect; dock: DockState;
  }>(null);

  /** 自分以外の、岸に着いているものの矩形 ── ぶつかる相手 */
  const others = useCallback(
    (key: string) =>
      docked.filter((d) => d.key !== key).map((d) => anchoredRect(d.dock, d.size, viewport)),
    [docked, viewport],
  );

  const onGripDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, d: Docked, side: ShowreSide, move: boolean) => {
      e.stopPropagation();
      setActive(d.key);
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
        /**
         * 固定された辺を掴んだ ── 岸の上を滑る。
         *
         * ★ 貼っている辺は「**カーソルがいま触れている辺**」で決まる。縁から離せば辺が無くなり、
         *   泡は岸から浮いてカーソルについてくる（＝剥がれていく途中が見える）。
         *   縁へ戻せばまた貼り付くし、辺をまたげば別の辺へ移る。
         */
        const edges = edgesNear({ x: e.clientX, y: e.clientY }, viewport);
        const size = { width: g.rect.width, height: g.rect.height };
        const slid = anchoredRect({ edges, at: { x: g.rect.x + dx, y: g.rect.y + dy } }, size, viewport);
        // 岸の上では重ならない。滑る向き（貼った辺と直交する向き）で、先客の縁で止める。
        // 縁から離れているとき（edges が空）は岸を出ていく途中なので、止めない
        const axis = edges.includes("left") || edges.includes("right") ? "y" : "x";
        const at = edges.length === 0
          ? slid
          : clampMoveAmongDocked(slid, axis, others(g.key), viewport, axis === "x" ? g.rect.x : g.rect.y);
        onUpdate(g.key, { dock: { edges, at: { x: at.x, y: at.y } }, size });
        return;
      }
      // 自由な辺を掴んだ ── 掴んだ辺の反対側が固定されるように、矩形を変える
      const next = { ...g.rect };
      // 下限は「取っ手が残る大きさ」だけ（SHOWRE_MIN_SIZE）。中身が入るかは中身が決める
      const min = SHOWRE_MIN_SIZE;
      if (g.side === "right") next.width = Math.max(min.width, g.rect.width + dx);
      if (g.side === "bottom") next.height = Math.max(min.height, g.rect.height + dy);
      if (g.side === "left") { next.width = Math.max(min.width, g.rect.width - dx); next.x = g.rect.x + (g.rect.width - next.width); }
      if (g.side === "top") { next.height = Math.max(min.height, g.rect.height - dy); next.y = g.rect.y + (g.rect.height - next.height); }
      // 伸ばせるのは**先客にぴったり接する所まで**（重ならない）
      const fit = clampResizeAmongDocked(next, g.side, others(g.key), min);
      onUpdate(g.key, {
        dock: { edges: g.dock.edges, at: { x: fit.x, y: fit.y } },
        size: { width: Math.min(fit.width, viewport.width), height: Math.min(fit.height, viewport.height) },
      });
    },
    [onUpdate, viewport, others],
  );

  const onGripUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const g = grab.current;
      grab.current = null;
      if (!g || !g.move) return;
      // 縁から遠くまで引いたら、岸から剥がして海へ返す。
      // 返す先は**いま見えている矩形**そのまま ── 剥がした所から飛ばない
      if (edgesNear({ x: e.clientX, y: e.clientY }, viewport).length > 0) return;
      const d = docked.find((x) => x.key === g.key);
      onUndock(g.key, d ? anchoredRect(d.dock, d.size, viewport) : g.rect);
    },
    [onUndock, viewport, docked],
  );

  const entries = useMemo(
    () =>
      docked.map((d) => {
        const rect = anchoredRect(d.dock, d.size, viewport);
        // 管を引くかどうかは**いま接している辺**で決まる（留め方ではない）
        const edges = touchingEdges(rect, viewport);
        return { d, rect, edges, inset: insetFor(edges, join) };
      }),
    [docked, viewport, join],
  );

  // 管は 1 枚にまとめて描く。海の縁と、貼り付いたバブルのまわりを、1 本の網として
  const outlines: ShowreTubeOutline[] = useMemo(
    () => [
      {
        rect: { x: 0, y: 0, width: viewport.width, height: viewport.height },
        // 迂回のときだけ、岸の管から**泡が占めている範囲**を抜く。
        // そこは泡の枠が受け持つので、泡と画面の縁の間には管が通らない（T 字にならない）
        ...(join === "detour"
          ? { cuts: entries.flatMap(({ rect, edges }) => detourCuts(rect, edges)) }
          : {}),
      },
      ...entries.map(({ rect, edges, inset }) => ({
        rect,
        joined: edges,
        // 光はアプリの中に入れない。中身がある所＝余白の内側がアプリ
        keepOut: {
          x: rect.x + inset.left,
          y: rect.y + inset.top,
          width: Math.max(0, rect.width - inset.left - inset.right),
          height: Math.max(0, rect.height - inset.top - inset.bottom),
        },
      })),
    ],
    [entries, viewport, join],
  );

  return (
    <>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
        {entries.map(({ d, inset }) => (
          <div
            key={d.key}
            data-docked-url={d.url}
            data-active={active === d.key ? "" : undefined}
            onPointerEnter={() => setActive(d.key)}
            style={{
              position: "absolute",
              pointerEvents: "auto",
              // 相手にしているものを上に。共有している縁は、上に居るほうの取っ手が取る
              zIndex: active === d.key ? 1 : 0,
              ...slotStyle(d.dock, viewport, d.size),
            }}
          >
            {/* 岸に着いたバブルは装飾を持たない。中身だけが管の内側に収まる */}
            <div
              style={{
                width: d.size.width,
                height: d.size.height,
                padding: `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`,
                boxSizing: "border-box",
                overflow: "hidden",
                // ★ 中身を 1 つの重なりに閉じ込める。中が海なら泡が z-index を持っていて、
                //   そのままだと辺の取っ手（下の SIDES）がその下に埋もれて掴めなくなる
                position: "relative",
                zIndex: 0,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  font: "13px/1.6 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif",
                  ...GROUND[d.ground ?? "light"],
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
                    zIndex: 1,   // 中身より上。辺そのものが取っ手なので、埋もれてはいけない
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
