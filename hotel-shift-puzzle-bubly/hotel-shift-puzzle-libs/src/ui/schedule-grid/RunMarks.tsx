import type { CSSProperties, FC } from "react";
import type { RunMark, WorkDayTone } from "./runMarkPlacement.js";

type RunMarksProps = {
  /** このセルに置く線（runMarksOf の結果のうち、anchorDay がこのセルの日のもの）。 */
  marks: readonly RunMark[];
};

/**
 * 各日の色を置く位置（列の左端からの割合）。真ん中（0.5）より左に寄せて、色の変わり目を
 * 前の日へずらす。上限に達した日は列の大半が黄になり、上限の手前の日で黄へ向かい始める。
 */
const STOP_IN_COLUMN = 0.25;

/**
 * 連勤の線のグラデーションの色の置き場所（offset は線の左端 0 〜 右端 1）。
 * 各日の色を列の中の STOP_IN_COLUMN に置き、間をなめらかにつなぐ。
 * 制約バーの連勤アイコン（MaxConsecutiveIcon）も同じ置き方で描く。
 */
export const workGradientStops = (
  dayTones: readonly WorkDayTone[]
): { tone: WorkDayTone; offset: number }[] =>
  dayTones.map((tone, i) => ({ tone, offset: (i + STOP_IN_COLUMN) / dayTones.length }));

/** 色そのものは styles.ts の --run-* で決める（ここは並べ方だけ）。 */
const workGradient = (dayTones: readonly WorkDayTone[]): string => {
  const stops = workGradientStops(dayTones).map(
    ({ tone, offset }) => `var(--run-${tone}) ${(offset * 100).toFixed(2)}%`
  );
  return `linear-gradient(to right, ${stops.join(", ")})`;
};

/**
 * セルの下端に重ねる連勤・連休の線（置き場所と色の決め方は runMarkPlacement.ts）。
 *
 * 違反の赤帯と同じく末尾のセルから左へ --span 列ぶん伸ばす。読むためだけの線なので
 * 操作は受けず（pointer-events:none）、下のセルの選択・ダブルクリックを邪魔しない。
 */
export const RunMarks: FC<RunMarksProps> = ({ marks }) => (
  <>
    {marks.map((mark) => (
      <span
        key={`${mark.kind}:${mark.anchorDay.key}`}
        className={`e-run-bar is-${mark.kind === "work" ? "work" : mark.tone}`}
        style={
          {
            ["--span" as string]: mark.span,
            ...(mark.kind === "work" && { background: workGradient(mark.dayTones) }),
          } as CSSProperties
        }
        title={mark.kind === "work" ? `${mark.span}連勤` : `${mark.span}連休`}
      />
    ))}
  </>
);
