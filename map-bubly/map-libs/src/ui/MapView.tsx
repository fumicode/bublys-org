'use client';
/**
 * 地図の絵 ── 湖と道とピンを 1 枚の SVG に描く。
 *
 * ★ **ここは何も覚えない。** 映す範囲も、指されているものも、道も、全部もらう。
 *   掴んで動かした量も「こう動かしたい」と外へ言うだけ ── 覚えるのは入れ物（slice）の仕事。
 * ★ 緯度経度から画面の位置への変換は {@link MapBounds_範囲.project} 1 本だけを通す。
 *   湖とピンで別々に計算すると、寄ったときにピンが湖から外れる。
 */
import { ComponentPropsWithoutRef, FC, useCallback, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { MapBounds_範囲 } from "../domain/MapBounds.domain.js";
import { Spot_地点 } from "../domain/Spot.domain.js";
import { HAKONE_ROAD, LAKESIDE_ROAD, LAKE_ASHI, type LatLng } from "../domain/hakoneGeography.js";

export type MapViewProps = {
  bounds: MapBounds_範囲;
  spots: readonly Spot_地点[];
  /** いま指されているもの。ピンが光る */
  focusedSpotId?: string | null;
  /** 道として繋ぐ地点の並び（旅程が渡す） */
  routeSpotIds?: readonly string[];
  /** 掴んで動かした／輪を回した結果の「こうしたい」 */
  onBoundsChange?: (next: MapBounds_範囲) => void;
  /** ピンを指したとき */
  onSpotFocus?: (spotId: string) => void;
  /** 「この範囲で探す」を押したとき */
  onSearchHere?: () => void;
  /** 探す範囲が決まっているか（ボタンの見た目に出す） */
  searching?: boolean;
};

export const MapView: FC<MapViewProps> = ({
  bounds,
  spots,
  focusedSpotId,
  routeSpotIds,
  onBoundsChange,
  onSpotFocus,
  onSearchHere,
  searching = false,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  /**
   * 絵の大きさは箱に聞く。泡は大きさが変わるものなので、決め打ちにすると
   * 広げたときに右下が空き、縮めたときに湖が切れる。
   */
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const ready = width > 0 && height > 0;

  const toPoints = useCallback(
    (path: readonly LatLng[]): string =>
      path
        .map((p) => {
          const { x, y } = bounds.project(p.lat, p.lng, width, height);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" "),
    [bounds, width, height],
  );

  /** 掴んで動かす ── 動いた px を緯度経度に戻して「こう動かしたい」と言う */
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onBoundsChange) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const from = dragRef.current;
    if (!from || !onBoundsChange || !ready) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (dx === 0 && dy === 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    // 右へ引けば西へ動く（地図を掴んで引っぱる向き）
    onBoundsChange(
      bounds.panned((dy / height) * bounds.latSpan, (-dx / width) * bounds.lngSpan),
    );
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const zoom = (factor: number) => onBoundsChange?.(bounds.zoomed(factor));

  return (
    /* 測る箱 ── 中身と同じ広さで、見た目には何も足さない（器と同じ書き方） */
    <div ref={boxRef} style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}>
      <StyledMap>
        {ready && (
          <svg
            className="e-canvas"
            width={width}
            height={height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <rect x={0} y={0} width={width} height={height} className="e-ground" />

            {/* 山あい ── 地の起伏の代わりのごく淡い帯。読みの邪魔をしない濃さに留める */}
            <polygon className="e-hill" points={toPoints(HILL_NORTH)} />
            <polygon className="e-hill" points={toPoints(HILL_SOUTH)} />

            <polygon className="e-lake" points={toPoints(LAKE_ASHI)} />
            <polyline className="e-road" points={toPoints(HAKONE_ROAD)} />
            <polyline className="e-road" points={toPoints(LAKESIDE_ROAD)} />

            {/* 渡された道 ── 地点の並びをそのまま繋ぐ */}
            {routeSpotIds && routeSpotIds.length >= 2 && (
              <polyline
                className="e-route"
                points={toPoints(
                  routeSpotIds
                    .map((id) => spots.find((s) => s.id === id))
                    .filter((s): s is Spot_地点 => s !== undefined)
                    .map((s) => ({ lat: s.lat, lng: s.lng })),
                )}
              />
            )}
          </svg>
        )}

        {/* ピンは SVG の外に置く ── 1 つ 1 つが掴める「もの」（ObjectView）になるので、
            HTML のまま重ねたほうが素直（SVG の中では ObjectView の span が置けない） */}
        {ready &&
          spots.map((spot) => {
            const { x, y } = bounds.project(spot.lat, spot.lng, width, height);
            if (x < -40 || y < -40 || x > width + 40 || y > height + 40) return null;
            const focused = spot.id === focusedSpotId;
            return (
              <div
                key={spot.id}
                className={`e-pin ${focused ? "is-focused" : ""}`}
                style={{ left: x, top: y }}
              >
                <ObjectView
                  type="Spot"
                  url={`spots/${spot.id}`}
                  label={spot.name}
                  openingPosition="bubble-side-right"
                  draggable
                  onClick={() => onSpotFocus?.(spot.id)}
                >
                  <span className="e-pin-body">
                    <span
                      className="e-pin-dot"
                      style={{ background: Spot_地点.categoryColor(spot.category) }}
                    />
                    <span className="e-pin-name">{spot.name}</span>
                  </span>
                </ObjectView>
              </div>
            );
          })}

        <div className="e-controls">
          <button type="button" onClick={() => zoom(1 / 1.6)} title="寄る">＋</button>
          <button type="button" onClick={() => zoom(1.6)} title="引く">−</button>
        </div>

        {onSearchHere && (
          <button
            type="button"
            className={`e-search ${searching ? "is-on" : ""}`}
            onClick={onSearchHere}
          >
            {searching ? "この範囲で探しています" : "この範囲で探す"}
          </button>
        )}
      </StyledMap>
    </div>
  );
};

/** 地の起伏（北の外輪山・南の山あい）。形だけの飾りなので緯度経度もおおまかでよい */
const HILL_NORTH: LatLng[] = [
  { lat: 35.262, lng: 138.995 },
  { lat: 35.258, lng: 139.06 },
  { lat: 35.246, lng: 139.12 },
  { lat: 35.262, lng: 139.12 },
];
const HILL_SOUTH: LatLng[] = [
  { lat: 35.186, lng: 139.0 },
  { lat: 35.196, lng: 139.05 },
  { lat: 35.208, lng: 139.12 },
  { lat: 35.186, lng: 139.12 },
];

/**
 * ★ 型を明示するのは**この版の styled-components の都合**（`ObjectView` と同じ書き方）。
 *   書かないと `styled.div` の props が空になり、`ref` も `onClick` も渡せない。
 */
const StyledMap = styled.div<ComponentPropsWithoutRef<'div'>>`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  font: 11px/1.4 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  touch-action: none;

  .e-canvas { display: block; cursor: grab; }
  .e-canvas:active { cursor: grabbing; }

  .e-ground { fill: #eaf3e6; }
  .e-hill { fill: #dcead4; }
  .e-lake { fill: #a8d4ee; stroke: #7fb9dd; stroke-width: 1; }
  .e-road { fill: none; stroke: #ffffff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .e-route {
    fill: none;
    stroke: #1f6fd0;
    stroke-width: 2.5;
    stroke-dasharray: 6 5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .e-pin {
    position: absolute;
    /* 点が地点の真上に来るように、印のぶんだけ持ち上げる */
    transform: translate(-6px, -6px);
    white-space: nowrap;
  }
  .e-pin-body {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 3px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 11px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    color: #1b2029;
  }
  .e-pin-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
    flex-shrink: 0;
  }
  .e-pin-name { max-width: 108px; overflow: hidden; text-overflow: ellipsis; }

  /* 指されているものは光る ── 旅程でもアクティビティでも、同じ地点なら同時に光る */
  .e-pin.is-focused {
    z-index: 2;
  }
  .e-pin.is-focused .e-pin-body {
    background: #fffbe6;
    border-color: #f0b429;
    box-shadow: 0 0 0 3px rgba(240, 180, 41, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
    font-weight: bold;
  }

  .e-controls {
    position: absolute;
    right: 8px;
    top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .e-controls button {
    width: 26px;
    height: 26px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.95);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }

  .e-search {
    position: absolute;
    left: 8px;
    top: 8px;
    padding: 4px 10px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.95);
    font-size: 11px;
    cursor: pointer;
    color: #1b2029;
  }
  .e-search.is-on {
    background: #1f6fd0;
    border-color: #1f6fd0;
    color: #fff;
  }
`;
