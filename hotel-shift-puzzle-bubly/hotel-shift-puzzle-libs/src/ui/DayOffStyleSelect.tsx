'use client';

import { FC } from "react";
import { DayOffStyle } from "../domain/index.js";

/** 選択肢の値（select の value は文字列なので、休みの形を文字列に畳む） */
const DEFAULT_VALUE = "__default__";

const valueOf = (style: DayOffStyle): string =>
  style.isClustered ? "clustered" : "spread";

const styleOf = (value: string): DayOffStyle =>
  value === "clustered" ? DayOffStyle.clustered() : DayOffStyle.spread();

const CHOICES: DayOffStyle[] = [DayOffStyle.spread(), DayOffStyle.clustered()];

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
 * 休みの形を選ぶ。分散型／連休型の2択トグル。
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
        {style.label}
      </option>
    ))}
  </select>
);
