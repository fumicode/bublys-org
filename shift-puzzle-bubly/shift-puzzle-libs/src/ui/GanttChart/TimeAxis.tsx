'use client';
import React from 'react';
import styled from 'styled-components';

interface TimeAxisProps {
  /** 表示開始時刻（0:00からの経過分数。例: 540 = 9:00） */
  dayStartMinute: number;
  /** 表示終了時刻（0:00からの経過分数。例: 1200 = 20:00） */
  dayEndMinute: number;
  /** 1時間あたりのピクセル幅 */
  hourPx: number;
}

/** 横スクロール領域内の時刻ラベル・グリッド線 */
export const TimeAxis: React.FC<TimeAxisProps> = ({ dayStartMinute, dayEndMinute, hourPx }) => {
  const minutePx = hourPx / 60;
  const totalWidth = (dayEndMinute - dayStartMinute) * minutePx;

  const startHour = Math.floor(dayStartMinute / 60);
  const endHour = Math.ceil(dayEndMinute / 60);

  const hourMarkers: { left: number; label: string }[] = [];
  const halfHourMarkers: { left: number }[] = [];

  for (let h = startHour; h <= endHour; h++) {
    const minute = h * 60;
    if (minute >= dayStartMinute && minute <= dayEndMinute) {
      const left = (minute - dayStartMinute) * minutePx;
      hourMarkers.push({ left, label: `${String(h).padStart(2, '0')}:00` });
    }
    const halfMinute = h * 60 + 30;
    if (halfMinute > dayStartMinute && halfMinute < dayEndMinute) {
      const left = (halfMinute - dayStartMinute) * minutePx;
      halfHourMarkers.push({ left });
    }
  }

  return (
    <StyledTimeAxis style={{ width: totalWidth }}>
      {hourMarkers.map((m) => (
        <div key={m.left} className="e-hour-mark" style={{ left: m.left }}>
          <span className="e-label">{m.label}</span>
        </div>
      ))}
      {halfHourMarkers.map((m, i) => (
        <div key={i} className="e-half-mark" style={{ left: m.left }} />
      ))}
    </StyledTimeAxis>
  );
};

const StyledTimeAxis = styled.div`
  position: relative;
  height: 100%;

  .e-hour-mark {
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 1px solid #c5cae9;

    .e-label {
      display: block;
      padding-left: 3px;
      font-size: 0.75em;
      color: #555;
      white-space: nowrap;
      line-height: 1;
      padding-top: 4px;
    }
  }

  .e-half-mark {
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 1px dashed #e0e0e0;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
