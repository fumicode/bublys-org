'use client';

import { FC } from "react";
import { DayOffStyle, DAY_OFF_STYLE_MAX_RUN_OPTIONS } from "../domain/index.js";

/** 選択肢の値（select の value は文字列なので、休みの形を文字列に畳む） */
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
   * 渡すと勤務表ごとの上書きとして扱う（既定値）。「既定（◯◯）」という選択肢は作らず、
   * 既定の形に「（既定）」と添える。**既定と同じ形を選んだら上書きを外す**（onChange(undefined)）。
   * スタッフプロファイルの欄（ProfileItemSelect）と同じルール
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
    value={valueOf(value ?? inherited ?? DayOffStyle.DEFAULT)}
    disabled={disabled}
    title={title}
    onChange={(e) => {
      const chosen = styleOf(e.target.value);
      onChange(inherited && chosen.equals(inherited) ? undefined : chosen);
    }}
  >
    {CHOICES.map((style) => (
      <option key={valueOf(style)} value={valueOf(style)}>
        {style.label === "連休型" ? "連休型（連勤上限まで）" : style.label}
        {inherited && style.equals(inherited) ? "（既定）" : ""}
      </option>
    ))}
  </select>
);
