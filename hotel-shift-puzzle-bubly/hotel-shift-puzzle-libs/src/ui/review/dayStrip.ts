/**
 * dayStrip — 振り返りの「日別の帯」に、どの日にどの印を置くか（純粋）
 *
 * 振り返りは、人ごとに1〜末日の帯を並べ、「いつ無理を引き受けてくれたか」を印で見せる。
 * 印は勤務表のシンボル辞書（schedule-grid/cellSymbols.ts）のもの。
 *
 * 帯の部品（ReviewDayStrip.tsx）と名前を変えてある。大文字小文字だけが違う2つのファイルを同じ
 * フォルダに置くと、esbuild（Vite の dev サーバー）が取り違え、Mac・Windows では1つに潰れる。
 *
 * - 譲歩した日       … 下端の赤い帯（違反の赤）。中身は行を開けば読めるので、いまは帯だけで描く
 * - 日に紐づかない譲歩（月の休日不足など） … 帯の右の「月」の欄に数える
 * - 繁忙日に出勤した日 … 淡い藍色の地（辞書の BUSY_DAY）
 *
 * **印は、その譲歩が指す日のうち、この月の日にだけ置く。** 範囲の最初と最後を結ばない。
 * 勤務間インターバルの譲歩は「前月末日と今月1日」のように前月の日を含むことがあり、
 * 最初と最後を結ぶと月全体が赤くなる（実際にそう見えていた）。
 */
import { WorkingDay } from "../../domain/index.js";
import type { BusyDayEntry, CompromiseEntry } from "../../domain/index.js";

export type DayStrip = {
  /** その月の日数（帯の長さ） */
  dayCount: number;
  /** 譲歩した日（1始まり。この月の日だけ） */
  compromiseDays: Set<number>;
  /** 繁忙日に出勤した日（1始まり） */
  busyDays: Set<number>;
  /** 日に紐づかない譲歩の件数 */
  monthlyCount: number;
};

/** その人の帯を組み立てる */
export function dayStripOf(params: {
  year: number;
  /** 1-12 */
  month: number;
  staffId: string;
  compromises: readonly CompromiseEntry[];
  busyDayContributions: readonly BusyDayEntry[];
}): DayStrip {
  const strip: DayStrip = {
    dayCount: new Date(params.year, params.month, 0).getDate(),
    compromiseDays: new Set(),
    busyDays: new Set(),
    monthlyCount: 0,
  };
  // この月の日なら日付（1始まり）、ほかの月の日なら undefined
  const dayInMonth = (dayKey: string): number | undefined => {
    const d = WorkingDay.fromKey(dayKey);
    return d.year === params.year && d.month === params.month ? d.day : undefined;
  };
  for (const c of params.compromises) {
    if (c.staffId !== params.staffId) continue;
    if (c.dayKeys.length === 0) {
      strip.monthlyCount++;
      continue;
    }
    for (const key of c.dayKeys) {
      const day = dayInMonth(key);
      if (day !== undefined) strip.compromiseDays.add(day);
    }
  }
  for (const b of params.busyDayContributions) {
    if (!b.workedStaffIds.includes(params.staffId)) continue;
    const day = dayInMonth(b.dayKey);
    if (day !== undefined) strip.busyDays.add(day);
  }
  return strip;
}
