/**
 * シフト希望の「回収状況」— 一覧に出す表示語彙。
 *
 * シフト希望はシフト作成者が本人から聞き取って入力する。だから1件の希望の状態は
 * 「まだ聞いていない（未入力）→ 聞いて入れている途中（入力あり）→ 聞き終わった（回収済み）」
 * の3段階になる。ドメイン（StaffMonthlyShiftWish）は `submittedAt` という汎用の
 * 「確定した時刻」しか持たず、それを**回収**と読むのはこの表示層の約束。
 *
 * 月一覧・月別一覧・スタッフ詳細の3画面が同じ語彙で並ぶよう、ここに1箇所だけ置く。
 * 純粋な .ts（React を含まない）なので feature からも import でき、テストもできる。
 * アイコンだけは JSX が要るので ShiftWishStatusIcon.tsx に分けてある。
 */
import type { Staff, StaffMonthlyShiftWish } from "../domain/index.js";

/** その人・その月の希望がどこまで進んでいるか */
export type ShiftWishStatus = "empty" | "draft" | "collected";

export const WISH_STATUS_LABEL: Record<ShiftWishStatus, string> = {
  empty: "未入力",
  draft: "入力あり",
  collected: "回収済み",
};

/**
 * 希望1件の状態。回収済み > 何か入っている > 未入力 の順で決まる
 * （回収済みなら中身が空でも「回収済み」＝「希望なしと聞き取った」ということ）。
 */
export const shiftWishStatusOf = (
  wish: StaffMonthlyShiftWish | undefined
): ShiftWishStatus => {
  if (!wish) return "empty";
  if (wish.isSubmitted) return "collected";
  return wish.isEmpty ? "empty" : "draft";
};

/** 回収した時刻を「5/20 18:03」のように短く出す（読めない値は空文字） */
export const collectedAtLabel = (iso: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return `${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, "0")}:${String(
    at.getMinutes()
  ).padStart(2, "0")}`;
};

/** 月一覧の1行：その月全体の回収の進み具合 */
export type ShiftWishMonthProgress = {
  year: number;
  /** 1-12 */
  month: number;
  /** 回収済みの人数 */
  collectedCount: number;
  /** 何かしら入力のある人数（回収済みを含む） */
  startedCount: number;
  /** その月の対象スタッフ数 */
  staffCount: number;
};

/** スタッフ詳細の1行：その人の、その月の状況 */
export type ShiftWishMonthSummary = {
  year: number;
  /** 1-12 */
  month: number;
  status: ShiftWishStatus;
  /** 何日ぶん希望を入れたか */
  filledDays: number;
  /** 回収した時刻（ISO文字列）。未回収は null */
  collectedAt: string | null;
};

/** 月別一覧の1行：その月の、その人の状況 */
export type ShiftWishStaffRow = {
  staff: Staff;
  status: ShiftWishStatus;
  /** 何日ぶん希望を入れたか */
  filledDays: number;
  /** 回収した時刻（ISO文字列）。未回収は null */
  collectedAt: string | null;
};
