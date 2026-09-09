'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  DAY_OFF_WISH,
  isBlockedByDayOff,
  nextWishPreference,
  wishMarkOf,
  wishMeaningOf,
} from "./shiftWishOptions.js";
import {
  StaffMonthlyShiftWish,
  WorkingDay,
  type ShiftWishPreference,
} from "../domain/index.js";

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

/** そのセルの見た目（マークの色分け） */
const cellClass = (
  optionKey: string,
  pref: ShiftWishPreference | undefined
): string => {
  if (!pref) return "";
  if (optionKey === DAY_OFF_WISH) return pref === "want" ? "is-day-off" : "is-avoid";
  return pref === "want" ? "is-want" : "is-avoid";
};

/** そのセルの今の意味と、押したらどうなるかを説明する */
const cellTitle = (
  dayLabel: string,
  option: WishOption,
  pref: ShiftWishPreference | undefined,
  blocked: boolean,
  readOnly: boolean
): string => {
  const head = `${dayLabel} ${option.label}: ${wishMeaningOf(option.key, pref)}`;
  if (readOnly) return head;

  const next = nextWishPreference(option.key, pref);
  const becomes = next
    ? `「${wishMeaningOf(option.key, next)}」になります`
    : "希望なしに戻ります";
  if (blocked) return `${head}（休み希望の日。押すと休みが外れて${becomes}）`;
  return `${head}（押すと${becomes}）`;
};

/**
 * 稼働日（行）× オプション（列）の希望表。
 *
 * 入力できるのは1日につき「休」か「勤務帯ごとの×／○」のどちらか一方。セルは押すたびに
 * 一巡する（休み列は 空欄→休→空欄、勤務帯列は 空欄→×→○→空欄）。休み希望の日は勤務帯
 * セルに斜線が入り、そこを押すと休みが外れて×が入る（後勝ち。ルールは shiftWishOptions
 * が持つ）。
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
                const blocked = isBlockedByDayOff(wish, day, o.key);
                return (
                  <td
                    key={o.key}
                    role="button"
                    className={[
                      "e-cell",
                      cellClass(o.key, pref),
                      blocked ? "is-blocked" : "",
                      readOnly ? "is-readonly" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={cellTitle(day.label, o, pref, blocked, readOnly)}
                    onClick={readOnly ? undefined : () => onToggle(day, o.key)}
                  >
                    {pref ? wishMarkOf(o.key, pref) : ""}
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
    /* ○（この帯に入りたい） */
    &.is-want {
      background-color: #e8f5e9;
      color: #2e7d32;
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
