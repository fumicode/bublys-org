'use client';

import { FC } from "react";
import { DayOffStyle, DAY_OFF_STYLE_MAX_RUN_OPTIONS } from "../domain/index.js";

/** 選択肢の値（select の value は文字列なので、休みの形を文字列に畳む） */
const DEFAULT_VALUE = "__default__";

const valueOf = (style: DayOffStyle): string =>
  style.isClustered ? `clustered:${style.maxRun ?? ""}` : "spread";

const styleOf = (value: string): DayOffStyle => {
  if (!value.startsWith("clustered:")) return DayOffStyle.spread();
  const n = Number(value.slice("clustered:".length));
  return DayOffStyle.clustered(Number.isFinite(n) && n > 0 ? n : undefined);
};

const CHOICES: DayOffStyle[] = [
  DayOffStyle.spread(),
  ...DAY_OFF_STYLE_MAX_RUN_OPTIONS.map((n) => DayOffStyle.clustered(n)),
  DayOffStyle.clustered(),
];

type Props = {
  /** いま選ばれている休みの形。inherited を渡したときに undefined なら「既定のまま」 */
  value: DayOffStyle | undefined;
  /**
   * 渡すと先頭に「既定（◯◯）」を出す。勤務表ごとの上書きで、上書きを外す選択肢。
   * 選ぶと onChange(undefined)。
   */
  inherited?: DayOffStyle;
  onChange: (style: DayOffStyle | undefined) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
};

/**
 * 休みの形を選ぶ。分散型／連休型（◯連まで／上限まで）。
 * 連休型は続けて出勤してよい日数（4連1休・5連1休の区別）を一緒に選ぶ。
 */
export const DayOffStyleSelect: FC<Props> = ({
  value,
  inherited,
  onChange,
  disabled,
  title,
  className,
}) => (
  <select
    className={className}
    value={value ? valueOf(value) : DEFAULT_VALUE}
    disabled={disabled}
    title={title}
    onChange={(e) =>
      onChange(e.target.value === DEFAULT_VALUE ? undefined : styleOf(e.target.value))
    }
  >
    {inherited && <option value={DEFAULT_VALUE}>既定（{inherited.label}）</option>}
    {CHOICES.map((style) => (
      <option key={valueOf(style)} value={valueOf(style)}>
        {style.label === "連休型" ? "連休型（連勤上限まで）" : style.label}
      </option>
    ))}
  </select>
);
