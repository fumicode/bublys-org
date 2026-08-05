'use client';

/**
 * DaySiteMapView — ある1日の状態を視覚化する純粋プレゼンテーショナル。
 *
 * 各現場（＋本社）を円で表し、円の中にその日その現場にいる社員・機械を並べる。
 * 現場どうしを線で結び、中点に距離（km）を表示する。座標は現場の position（km 相当）から配置する。
 */
import { FC } from "react";
import styled from "styled-components";

export type DayCircle = {
  id: string;
  name: string;
  kind: "site" | "hq";
  /** 座標（km 相当） */
  x: number;
  y: number;
  employees: string[];
  machines: string[];
};

export type DayDistance = { fromId: string; toId: string; km: number };

type DaySiteMapViewProps = {
  dayLabel: string;
  circles: DayCircle[];
  distances: DayDistance[];
};

const W = 600;
const H = 470;
const R = 72;
const MARGIN = 112;

export const DaySiteMapView: FC<DaySiteMapViewProps> = ({ dayLabel, circles, distances }) => {
  const xs = circles.map((c) => c.x);
  const ys = circles.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const cx = (c: DayCircle) => MARGIN + ((c.x - minX) / spanX) * (W - 2 * MARGIN);
  const cy = (c: DayCircle) => MARGIN + ((c.y - minY) / spanY) * (H - 2 * MARGIN);

  const centerById = new Map(circles.map((c) => [c.id, { x: cx(c), y: cy(c) }]));

  return (
    <StyledWrap>
      <div className="e-title">{dayLabel} の状態</div>
      <div className="e-canvas" style={{ width: W, height: H }}>
        <svg className="e-lines" width={W} height={H}>
          {distances.map((d) => {
            const a = centerById.get(d.fromId);
            const b = centerById.get(d.toId);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const label = `${d.km.toFixed(1)}km`;
            return (
              <g key={`${d.fromId}-${d.toId}`}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b0bec5" strokeWidth={1.5} strokeDasharray="5 4" />
                <rect x={mx - label.length * 4} y={my - 9} width={label.length * 8} height={16} rx={4} fill="#ffffff" stroke="#e0e0e0" />
                <text x={mx} y={my + 3} textAnchor="middle" fontSize="11" fill="#546e7a">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {circles.map((c) => {
          const x = cx(c);
          const y = cy(c);
          const empty = c.employees.length === 0 && c.machines.length === 0;
          return (
            <div key={c.id}>
              {/* 現場名は円の外（上）に置く。円の overflow で切られないように。 */}
              <div className={`e-clabel ${c.kind}`} style={{ left: x, top: y - R - 4 }}>
                {c.kind === "hq" ? "🏢 本社" : c.name}
              </div>
              <div
                className={`e-circle ${c.kind}`}
                style={{ left: x - R, top: y - R, width: R * 2, height: R * 2 }}
              >
                <div className="e-cbody">
                  {empty && <div className="e-none">—</div>}
                  {c.employees.map((n, i) => (
                    <span key={`e${i}`} className="e-tag e-emp" title={n}>
                      👷 {n}
                    </span>
                  ))}
                  {c.machines.map((n, i) => (
                    <span key={`m${i}`} className="e-tag e-mac" title={n}>
                      🚜 {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  padding: 6px;

  .e-title {
    font-weight: bold;
    margin: 0 0 6px;
  }

  .e-canvas {
    position: relative;
    background: #fbfcfe;
    border: 1px solid #eceff1;
    border-radius: 8px;
  }

  .e-lines {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* 現場名（円の外・上に配置。切れずに全部表示） */
  .e-clabel {
    position: absolute;
    transform: translate(-50%, -100%);
    white-space: nowrap;
    font-size: 0.76em;
    font-weight: bold;
    color: #37474f;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 1px 6px;
    pointer-events: none;
    z-index: 2;
    &.hq { color: #455a64; }
  }

  .e-circle {
    position: absolute;
    box-sizing: border-box;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 14px;
    overflow: hidden;
    background: radial-gradient(circle at 50% 35%, #ffffff, #eef4ff);
    border: 2px solid #90caf9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    &.hq {
      background: radial-gradient(circle at 50% 35%, #ffffff, #eceff1);
      border-color: #b0bec5;
    }

    .e-cbody {
      width: 100%;
      max-height: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      justify-content: center;
      align-content: center;
      overflow-y: auto;
    }
    .e-none { color: #b0bec5; font-size: 0.9em; }
    .e-tag {
      font-size: 0.62em;
      line-height: 1.4;
      padding: 0 4px;
      border-radius: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      &.e-emp { background: #e8f0fe; color: #1a3c6e; border: 1px solid #c5d8f7; }
      &.e-mac { background: #fff3e0; color: #7a4a00; border: 1px solid #ffcc80; }
    }
  }
`;
