'use client';

/**
 * useConstraintSetEditor — 制約セットを読み書きする唯一の入口。
 *
 * 制約セットは2通りあり、読み先も書き先も違う:
 *   - グローバルのテンプレート（id="global"）… 世界を持たない。保存はグローバル台帳へ1回
 *   - 勤務表ごとの独自セット（id=scheduleId）… 勤務表の世界線へ、操作履歴と同じノードで
 *
 * **この分岐を持つのはここだけ。** 呼び出し側（バブル）は制約セットIDを渡して commit を
 * 呼ぶだけで、どちらに書かれるかを知らない。分岐が2箇所に増えた瞬間、片方だけ直す事故が起きる。
 *
 * 前提: **制約セットの id は、そのセットが向く勤務帯セットの id と同じ**
 * （global/global、scheduleId/scheduleId）。だから勤務帯の選択肢も同じ id で引ける。
 * この前提が崩れると、担当勤務帯の選択肢だけが静かにズレる。
 */
import { useCallback, useMemo } from "react";
import { useAppStore } from "@bublys-org/state-management";
import {
  ConstraintSet,
  MonthlyStaffSchedule,
  WorkShiftSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  useObject,
  useObjectRepo,
  useIsAbsent,
  useObjectsPending,
} from "../objects/repository.js";
import {
  CONSTRAINT_SET_TYPE,
  GLOBAL_CONSTRAINT_SET_ID,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
} from "../objects/hotelObjects.js";
import { buildScheduleConstraints } from "./scheduleConstraints.js";
import { recordConstraintEdit } from "./recordScheduleEdit.js";
import { shiftColorOfNames } from "../ui/ScheduleConstraintsBar.js";
import type { IconColor } from "../ui/constraint-icons/common.js";

export type ConstraintSetEditor = {
  /** いまの制約セット。読めていなければ undefined */
  constraintSet: ConstraintSet | undefined;
  /** グローバルのテンプレートか */
  isGlobal: boolean;
  /** このセットが向く勤務帯（担当勤務帯の選択肢） */
  shiftNames: string[];
  /** 担当勤務帯名 → 色 */
  shiftColorOf: (shiftName: string) => IconColor;
  /** いま編集してよいか（読めないだけのものを既定で上書きしないための番人） */
  canEdit: boolean;
  /**
   * 制約セットを1つ変換して保存する。**1回呼ぶ＝記録1回**。
   * 変わらなければ何も書かない（同じ内容のノードを世界線に積まない）。
   */
  commit: (fn: (set: ConstraintSet) => ConstraintSet, summary: string) => void;
};

export function useConstraintSetEditor(
  constraintSetId: string | undefined
): ConstraintSetEditor {
  const store = useAppStore();
  const isGlobal = constraintSetId === GLOBAL_CONSTRAINT_SET_ID;

  const constraintSet = useObject<ConstraintSet>(
    CONSTRAINT_SET_TYPE,
    constraintSetId
  );
  // シェル（update）ではなくリポジトリを使う。シェルは現在値が無いと何もしないので、
  // まだ無いテンプレートの「最初の1本」が黙って落ちる
  const repo = useObjectRepo<ConstraintSet>(CONSTRAINT_SET_TYPE);
  const absent = useIsAbsent(CONSTRAINT_SET_TYPE, constraintSetId);
  const pending = useObjectsPending();

  // 勤務帯セットは制約セットと同じ id で引く（前提はこのファイルの冒頭）
  const workShiftSet = useObject<WorkShiftSet>(
    WORKSHIFT_SET_TYPE,
    constraintSetId
  );
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);

  // 勤務表ごとのときだけ、違反差分の計算に勤務表が要る
  const schedule = useObject<MonthlyStaffSchedule>(
    SCHEDULE_TYPE,
    isGlobal ? undefined : constraintSetId
  );

  const shiftNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const w of workShifts) {
      if (!seen.has(w.name)) {
        seen.add(w.name);
        names.push(w.name);
      }
    }
    return names;
  }, [workShifts]);

  const shiftColorOf = useMemo(
    () => shiftColorOfNames(workShifts),
    [workShifts]
  );

  const shiftIdsOf = useCallback(
    (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id),
    [workShifts]
  );

  // 「読めないだけ」と「本当に無い」を分ける。読めないだけのものを空で作り直すと、
  // 中身のある制約セットを上書きしてしまう（見ているだけでデータが壊れる）。
  const canEdit =
    constraintSetId !== undefined && !pending && (constraintSet !== undefined || absent);

  const commit = useCallback(
    (fn: (set: ConstraintSet) => ConstraintSet, summary: string) => {
      if (constraintSetId === undefined) return;
      if (constraintSet === undefined && !absent) return; // 読めないだけかもしれない
      const base = constraintSet ?? ConstraintSet.empty(constraintSetId);
      const next = fn(base);
      if (next === base && constraintSet !== undefined) return; // 何も変わらなかった

      if (isGlobal) {
        // テンプレートは世界を持たない。グローバル台帳へ1回書くだけ
        repo.save(next);
        return;
      }

      // 勤務表ごとは、操作履歴と同じ世界線ノードに載せる
      recordConstraintEdit(store, {
        schedule,
        beforeConstraints: buildScheduleConstraints({
          modelConstraints: base.modelConstraints(shiftIdsOf),
        }),
        afterConstraints: buildScheduleConstraints({
          modelConstraints: next.modelConstraints(shiftIdsOf),
        }),
        nextConstraints: next,
        summary,
      });
    },
    [
      store,
      constraintSetId,
      constraintSet,
      absent,
      isGlobal,
      repo,
      schedule,
      shiftIdsOf,
    ]
  );

  return { constraintSet, isGlobal, shiftNames, shiftColorOf, canEdit, commit };
}
