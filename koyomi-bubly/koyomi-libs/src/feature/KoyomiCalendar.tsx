'use client';

/**
 * 暦のカレンダー（月ごと）。どの月を見ているかはこのバブルの中だけの状態（世界線には載せない）。
 * 「今日」はここで時計を読んで作り、モデル（koyomi-model）には年月日だけを渡す。
 */
import { FC, useMemo, useState } from "react";
import { RokuyoCalendarView } from "../ui/RokuyoCalendarView.js";

export const KoyomiCalendar: FC<{ year?: number; month?: number }> = ({ year, month }) => {
  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }, []);
  const [shown, setShown] = useState({
    year: year ?? today.year,
    month: month ?? today.month,
  });
  const shift = (n: number) =>
    setShown(({ year: y, month: m }) => {
      const d = new Date(y, m - 1 + n, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  return (
    <RokuyoCalendarView
      year={shown.year}
      month={shown.month}
      today={today}
      onPrev={() => shift(-1)}
      onNext={() => shift(1)}
    />
  );
};
