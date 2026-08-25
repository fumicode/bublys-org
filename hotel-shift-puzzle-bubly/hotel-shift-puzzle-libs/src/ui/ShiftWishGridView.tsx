'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  DAY_OFF_WISH,
  isBlockedByDayOff,
  wishMarkOf,
  wishPreferenceOf,
} from "./shiftWishOptions.js";
import { StaffMonthlyShiftWish, WorkingDay } from "../domain/index.js";

type WishOption = { key: string; label: string };

type ShiftWishGridViewProps = {
  wish: StaffMonthlyShiftWish;
  /** 列に並べるオプション（休み・各勤務帯名） */
  options: WishOption[];
  /** セルをクリックしたとき（そのマークを入れる／外す） */
  onToggle: (day: WorkingDay, optionKey: string) => void;
  /** 提出済みなど、編集できない状態で表示する */
  readOnly?: boolean;
};

/**
 * 新仕様に無い極性（旧データの「勤務帯○」など）が残っていたときの表示。
 * 押せば新仕様のマーク（×）に寄る。
 */
const LEGACY_MARK: Record<string, string> = { want: "○", avoid: "×" };

/** そのセルの今の意味と、押したらどうなるかを説明する */
const cellTitle = (
  dayLabel: string,
  option: WishOption,
  pref: string | undefined,
  blocked: boolean,
  readOnly: boolean
): string => {
  const isDayOffOption = option.key === DAY_OFF_WISH;
  const meaning = pref
    ? isDayOffOption
      ? "この日は休みたい"
      : "この帯には入れない"
    : "希望なし";
  const head = `${dayLabel} ${option.label}: ${meaning}`;
  if (readOnly) return head;
  if (blocked) return `${head}（休み希望の日。押すと休みが外れて「入れない」になります）`;
  if (pref) return `${head}（押すと取り消します）`;
  return `${head}（押すと「${isDayOffOption ? "休みたい" : "この帯には入れない"}」になります）`;
};

/**
 * 稼働日（行）× オプション（列）の希望表。
 *
 * 入力できるのは1日につき「休」か「勤務帯×の集合」のどちらか一方で、クリックすると
 * そのマークが入る／外れる。休み希望の日は勤務帯セルに斜線が入り、そこを押すと
 * 休みが外れて×が入る（後勝ち。ルールは shiftWishOptions が持つ）。
 */
export const ShiftWishGridView: FC<ShiftWishGridViewProps> = ({
  wish,
  options,
  onToggle,
  readOnly = false,
}) => {
  const days = wish.workingDays();
  const weekdayLabel = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-corner"></th>
          {options.map((o) => (
            <th key={o.key} className="e-opt">
              {o.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {days.map((day) => {
          const wd = day.weekday;
          return (
            <tr key={day.key}>
              <td
                className={`e-day${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}`}
              >
                {day.day}
                <span className="e-wd">（{weekdayLabel[wd]}）</span>
              </td>
              {options.map((o) => {
                const pref = wish.preferenceFor(day, o.key);
                const marked = pref === wishPreferenceOf(o.key);
                const blocked = isBlockedByDayOff(wish, day, o.key);
                const isDayOffOption = o.key === DAY_OFF_WISH;
                return (
                  <td
                    key={o.key}
                    role="button"
                    className={[
                      "e-cell",
                      marked ? (isDayOffOption ? "is-day-off" : "is-avoid") : "",
                      !marked && pref ? "is-legacy" : "",
                      blocked ? "is-blocked" : "",
                      readOnly ? "is-readonly" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={cellTitle(day.label, o, pref, blocked, readOnly)}
                    onClick={readOnly ? undefined : () => onToggle(day, o.key)}
                  >
                    {pref ? (marked ? wishMarkOf(o.key) : LEGACY_MARK[pref]) : ""}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </StyledTable>
  );
};

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: 0.85em;

  th,
  td {
    border: 1px solid #eee;
    padding: 3px 8px;
    text-align: center;
  }

  thead th {
    position: sticky;
    top: 0;
    background: #fafafa;
    z-index: 1;
  }

  .e-corner {
    font-weight: normal;
    color: #777;
    font-size: 0.85em;
  }

  .e-day {
    text-align: right;
    font-weight: bold;
    white-space: nowrap;
    background: #fafafa;
    .e-wd {
      font-weight: normal;
      font-size: 0.8em;
      color: #999;
    }
    &.is-sun {
      color: #d32f2f;
    }
    &.is-sat {
      color: #1976d2;
    }
  }

  .e-cell {
    min-width: 44px;
    cursor: pointer;
    font-weight: bold;
    color: #bbb;
    user-select: none;

    /* 背景は色と斜線を重ねるので background-color と background-image を分けて使う */
    &:not(.is-readonly):hover {
      background-color: #f0f4f8;
    }
    /* 休（この日は休みたい） */
    &.is-day-off {
      background-color: #eceff1;
      color: #455a64;
    }
    /* ×（この帯には入れない） */
    &.is-avoid {
      background-color: #ffebee;
      color: #c62828;
    }
    /* 旧データの ○ など、新仕様に無い極性 */
    &.is-legacy {
      background-color: #f5f5f5;
      color: #9e9e9e;
    }
    /*
     * 休み希望の日の勤務帯セル。斜線で「今は選べない」ことを示す。
     * クリックは受け付ける（押すと休みが外れて×が入る＝後勝ち）。
     */
    &.is-blocked {
      background-image: linear-gradient(
        to top right,
        transparent calc(50% - 0.5px),
        #cfd8dc calc(50% - 0.5px),
        #cfd8dc calc(50% + 0.5px),
        transparent calc(50% + 0.5px)
      );
    }
    &.is-readonly {
      cursor: default;
    }
  }
`;
