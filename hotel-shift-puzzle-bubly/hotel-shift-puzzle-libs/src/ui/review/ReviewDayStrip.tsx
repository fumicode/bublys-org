'use client';

import { FC } from "react";
import type { HTMLAttributes } from "react";
import styled from "styled-components";
import { BUSY_DAY, VIOLATION } from "../schedule-grid/cellSymbols.js";
import type { DayStrip } from "./reviewDayStrip.js";

/** 帯の1日ぶんの幅（px） */
export const STRIP_DAY_WIDTH = 10;
/** 帯の高さ（px） */
const STRIP_HEIGHT = 16;
/** 譲歩の赤い帯の太さ（px） */
const BAND_HEIGHT = 4;

/**
 * 振り返りの日別の帯（1人ぶん）。どの日に印を置くかは reviewDayStrip.ts が決める。
 * 印の色は勤務表のシンボル辞書（cellSymbols.ts）のもの。
 */
export const ReviewDayStrip: FC<{ strip: DayStrip }> = ({ strip }) => (
  <StyledStrip aria-hidden>
    {Array.from({ length: strip.dayCount }, (_, i) => {
      const day = i + 1;
      const cls = [
        "e-day",
        strip.busyDays.has(day) ? "is-busy" : "",
        strip.compromiseDays.has(day) ? "is-compromise" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return <span key={day} className={cls} />;
    })}
  </StyledStrip>
);

/** 帯の上に添える日の目盛り（1・10・20・末日） */
export const ReviewDayScale: FC<{ dayCount: number }> = ({ dayCount }) => (
  <StyledScale style={{ width: dayCount * STRIP_DAY_WIDTH }} aria-hidden>
    {[1, 10, 20, dayCount].map((d) => (
      <span key={d} style={{ left: (d - 1) * STRIP_DAY_WIDTH }}>
        {d}
      </span>
    ))}
  </StyledScale>
);

/** 凡例・「月」の欄に使う、帯と同じ見た目の1マス */
export const ReviewMark: FC<{ kind: "compromise" | "busy" }> = ({ kind }) => (
  <StyledMark aria-hidden>
    <span className={`e-day is-${kind}`} />
  </StyledMark>
);

/** 1マスの見た目（帯・凡例で共通） */
const dayCellStyles = `
  .e-day {
    position: relative;
    width: ${STRIP_DAY_WIDTH}px;
    height: ${STRIP_HEIGHT}px;
    box-sizing: border-box;
    border-right: 1px solid #d0d0d0;
    background: #fff;

    &:last-child {
      border-right: none;
    }

    /* 繁忙日に出勤：淡い藍色の地 */
    &.is-busy {
      background: ${BUSY_DAY}33;
    }

    /* 譲歩した日：下端の赤い帯（勤務表の違反の赤） */
    &.is-compromise::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: ${BAND_HEIGHT}px;
      background: ${VIOLATION};
    }
  }
`;

const StyledStrip = styled.span<HTMLAttributes<HTMLSpanElement>>`
  display: inline-flex;
  flex-shrink: 0;
  border: 1px solid #9e9e9e;
  border-radius: 2px;
  overflow: hidden;
  ${dayCellStyles}
`;

const StyledScale = styled.span<HTMLAttributes<HTMLSpanElement>>`
  position: relative;
  display: inline-block;
  height: 12px;
  flex-shrink: 0;
  font-size: 9px;
  color: #888;

  span {
    position: absolute;
    top: 0;
  }
`;

const StyledMark = styled.span<HTMLAttributes<HTMLSpanElement>>`
  display: inline-flex;
  vertical-align: middle;
  border: 1px solid #9e9e9e;
  border-radius: 2px;
  overflow: hidden;
  ${dayCellStyles}
`;
