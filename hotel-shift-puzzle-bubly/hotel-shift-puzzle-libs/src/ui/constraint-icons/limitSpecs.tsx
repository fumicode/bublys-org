'use client';

/**
 * limitSpecs — 「数と真偽で言い切れる制約」1つぶんの記述を1枚にまとめたテーブル。
 *
 * 連勤上限・月の最低休日・1日の休み上限・希望チェックは、どれも
 * 「制約セットから1つ読んで、1つ書き戻す」だけの制約。個別のコンポーネントも
 * 個別のハンドラも要らないので、**違うのはこの表の1行だけ**にしてある。
 *
 * バーの小さいアイコンも、バブルの大きい図も、ツールチップの文も、操作履歴の文言も、
 * 全部この1行から出る（同じものを2度書かない）。制約を1つ増やすときに触るのはここだけ。
 *
 * `key` は**バブルの住所に載る**。ドメインの属性名（maxConsecutiveWorkdays）をそのまま
 * 載せると、属性を改名した日に URL が壊れる。ケバブケースの固定スラッグとして別に持つ。
 */
import type { ReactNode } from "react";
import { ConstraintSet } from "../../domain/index.js";
import { MaxDayOffPerDayIcon } from "./MaxDayOffPerDayIcon.js";
import { MinMonthlyDayOffIcon } from "./MinMonthlyDayOffIcon.js";
import { MaxConsecutiveIcon } from "./MaxConsecutiveIcon.js";
import { WishIcon } from "./WishIcon.js";

/** バーの3群。稼働日ごと（縦↕）／人ごと（横↔）／全体 */
export type LimitGroup = "per-day" | "per-person" | "whole";

/** 制約1つぶんの記述 */
export type LimitSpec = {
  /** 住所に載る固定スラッグ。ドメインの属性名とは独立 */
  key: string;
  /** アイコン下の短いラベル */
  caption: string;
  /** バーのどの群に置くか */
  group: LimitGroup;
  /** 数で決まるか、入/切で決まるか */
  kind: "number" | "boolean";
  /** 入力欄のラベルと単位（数のときだけ使う） */
  label: string;
  unit?: string;
  /** 制約セットから現在の値を読む */
  read: (set: ConstraintSet) => number | boolean;
  /** 値を適用した新しい制約セットを返す */
  apply: (set: ConstraintSet, value: number | boolean) => ConstraintSet;
  /** いまの値を1行の日本語にする（ツールチップと図の説明） */
  describe: (value: number | boolean) => string;
  /** 操作履歴に残す文言 */
  summary: (value: number | boolean) => string;
  /** その値の図を描く */
  render: (value: number | boolean, size?: number) => ReactNode;
};

const asNumber = (v: number | boolean): number => (typeof v === "number" ? v : 0);
const asBoolean = (v: number | boolean): boolean => v === true;

/**
 * 並び順がそのままバーの並び順になる。
 * 群の中の順序も、いまの見た目（休み上限 → 休日 → 連勤 → 希望）をこの順で再現する。
 */
export const LIMIT_SPECS: LimitSpec[] = [
  {
    key: "max-day-off-per-day",
    caption: "休み上限",
    group: "per-day",
    kind: "number",
    label: "1日に休めるのは",
    unit: "人まで",
    read: (set) => set.maxDayOffPerDay,
    apply: (set, v) => set.withMaxDayOffPerDay(asNumber(v)),
    describe: (v) => `1日に休めるのは${asNumber(v)}人まで`,
    summary: (v) => `1日の休み上限を ${asNumber(v)}人 にした`,
    render: (v, size) => <MaxDayOffPerDayIcon max={asNumber(v)} size={size} />,
  },
  {
    key: "min-monthly-day-off",
    caption: "休日",
    group: "per-person",
    kind: "number",
    label: "月に",
    unit: "日以上休む",
    read: (set) => set.minMonthlyDayOff,
    apply: (set, v) => set.withMinMonthlyDayOff(asNumber(v)),
    describe: (v) => `月に${asNumber(v)}日以上休む`,
    summary: (v) => `月の最低休日を ${asNumber(v)}日 にした`,
    render: (v, size) => <MinMonthlyDayOffIcon min={asNumber(v)} size={size} />,
  },
  {
    key: "max-consecutive-workdays",
    caption: "連勤",
    group: "per-person",
    kind: "number",
    label: "連勤は最大",
    unit: "日まで",
    read: (set) => set.maxConsecutiveWorkdays,
    apply: (set, v) => set.withMaxConsecutiveWorkdays(asNumber(v)),
    describe: (v) => `連勤は最大${asNumber(v)}日まで`,
    summary: (v) => `連勤上限を ${asNumber(v)}日 にした`,
    render: (v, size) => <MaxConsecutiveIcon max={asNumber(v)} size={size} />,
  },
  {
    key: "check-shift-wish",
    caption: "希望",
    group: "whole",
    kind: "boolean",
    label: "できるだけシフト希望に沿う",
    read: (set) => set.checkShiftWish,
    apply: (set, v) => set.withCheckShiftWish(asBoolean(v)),
    describe: (v) =>
      asBoolean(v)
        ? "できるだけシフト希望に沿う（沿わない日は違反として出す）"
        : "シフト希望は見ない",
    summary: (v) => `希望チェックを${asBoolean(v) ? "入" : "切"}にした`,
    render: (v, size) => <WishIcon on={asBoolean(v)} size={size} />,
  },
];

/** 住所のスラッグから1件引く */
export const limitSpecOf = (key: string): LimitSpec | undefined =>
  LIMIT_SPECS.find((spec) => spec.key === key);

/** その群に属する制約（バーの振り分け用） */
export const limitSpecsIn = (group: LimitGroup): LimitSpec[] =>
  LIMIT_SPECS.filter((spec) => spec.group === group);
