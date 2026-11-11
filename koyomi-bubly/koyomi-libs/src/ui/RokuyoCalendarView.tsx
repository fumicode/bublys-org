'use client';

/**
 * 月のカレンダーに六曜を出す（プレゼンテーショナル）。
 *
 * 六曜は6つ全部を小さく出し、婚礼などで忙しさが変わる大安・友引・仏滅だけ色を付ける。
 * 旧暦の表の範囲（2020〜2032年）の外の日は、六曜を出さない。
 */
import { FC } from "react";
import styled from "styled-components";
import { rokuyoOf, type RokuyoId } from "@bublys-org/koyomi-model";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 色を付ける六曜（それ以外は地の色のまま） */
export const ROKUYO_COLOR: Partial<Record<RokuyoId, string>> = {
  taian: "#c62828",
  tomobiki: "#2e7d32",
  butsumetsu: "#455a64",
};

type Props = {
  year: number;
  /** 1-12 */
  month: number;
  /** 今日（印を付ける）。省略すると付けない */
  today?: { year: number; month: number; day: number };
  onPrev: () => void;
  onNext: () => void;
};

export const RokuyoCalendarView: FC<Props> = ({ year, month, today, onPrev, onNext }) => {
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const blanks = first.getDay();
  const isToday = (d: number) =>
    today !== undefined && today.year === year && today.month === month && today.day === d;
  const anyRokuyo = rokuyoOf({ year, month, day: 1 }) || rokuyoOf({ year, month, day: days });

  return (
    <StyledCalendar>
      <div className="e-head">
        <button type="button" onClick={onPrev} aria-label="前の月">
          ‹
        </button>
        <span className="e-title">
          {year}年{month}月
        </span>
        <button type="button" onClick={onNext} aria-label="次の月">
          ›
        </button>
      </div>
      <div className="e-grid">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`e-wd${i === 0 ? " is-sun" : i === 6 ? " is-sat" : ""}`}>
            {w}
          </div>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const wd = (blanks + i) % 7;
          const r = rokuyoOf({ year, month, day: d });
          return (
            <div
              key={d}
              className={`e-day${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}${
                isToday(d) ? " is-today" : ""
              }`}
            >
              <span className="e-num">{d}</span>
              {r && (
                <span className="e-rokuyo" style={{ color: ROKUYO_COLOR[r.id] }}>
                  {r.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!anyRokuyo && <p className="e-note">六曜は2020〜2032年の日だけ出します</p>}
    </StyledCalendar>
  );
};

const StyledCalendar = styled.div`
  padding: 8px;
  min-width: 300px;
  font-size: 13px;

  .e-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;

    button {
      border: none;
      background: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0 8px;
    }
  }

  .e-title {
    font-weight: bold;
  }

  .e-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .e-wd {
    text-align: center;
    font-size: 0.85em;
    color: #666;
  }

  .e-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2px 0;
    border-radius: 4px;
    background: #fafafa;
  }

  .e-day.is-today {
    outline: 2px solid #1976d2;
  }

  .is-sun .e-num,
  .e-wd.is-sun {
    color: #c62828;
  }

  .is-sat .e-num,
  .e-wd.is-sat {
    color: #1565c0;
  }

  .e-rokuyo {
    font-size: 0.75em;
    color: #888;
  }

  .e-note {
    margin: 6px 0 0;
    font-size: 0.8em;
    color: #888;
  }
`;
