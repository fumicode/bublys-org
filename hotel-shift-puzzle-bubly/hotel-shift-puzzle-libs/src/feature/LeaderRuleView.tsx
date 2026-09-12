'use client';

import { FC, useCallback, useMemo } from "react";
import { getDragType, extractIdFromUrl } from "@bublys-org/bubbles-ui";
import {
  WorkShiftSet,
  ConstraintSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import { LeaderRuleDiagram } from "../ui/LeaderRuleDiagram.js";
import { useObject } from "../objects/repository.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
} from "../objects/hotelObjects.js";
import { ConstraintSetWorld } from "./ConstraintSetWorld.js";
import { useConstraintSetEditor } from "./useConstraintSetEditor.js";
import { useWorkingStaff } from "./workingStaff.js";

type LeaderRuleViewProps = {
  /** どの制約セットか（"global" か scheduleId） */
  constraintSetId?: string;
  /** 表示する責任者ロールのキー（例: "early" / "reservation" / "night"） */
  ruleKey: string;
};

/**
 * 責任者ルール1件をビジュアル化するバブルの中身。
 * 勤務表ごとの制約オブジェクト（ConstraintSet）から該当ロールのルールを取り出し、
 * {@link LeaderRuleDiagram} に渡して「OR（このうち誰か一人はいなければならない）」の図を描く。
 * 人をドロップすると、その人を制約の候補に加えて保存する（＝勤務表の世界線にノードが増える）。
 */
const LeaderRuleViewBody: FC<LeaderRuleViewProps> = ({
  constraintSetId,
  ruleKey,
}) => {
  const { constraintSet: constraints, isGlobal, commit } =
    useConstraintSetEditor(constraintSetId);
  // 担当者は名簿のスタッフ。グローバルのテンプレートには名簿が無いので空になる
  const { staffList } = useWorkingStaff(isGlobal ? undefined : constraintSetId);
  const workShiftSet = useObject<WorkShiftSet>(
    WORKSHIFT_SET_TYPE,
    constraintSetId
  );
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);

  const rule = useMemo(
    () => constraints?.leaderRule(ruleKey),
    [constraints, ruleKey]
  );

  // 担当勤務帯の id（名前→id）。図の「流れ」を勤務帯の色で塗るために渡す。
  const shiftId = useMemo(
    () => (rule ? workShifts.find((w) => w.name === rule.shiftName)?.id : undefined),
    [workShifts, rule]
  );

  // 「入るべき時間帯」セレクトの選択肢＝重複を除いた勤務帯名の一覧。
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


  /**
   * 編集は制約セットの編集口（useConstraintSetEditor）に任せる。
   * グローバルなら台帳へ1回、勤務表ごとなら操作履歴と同じ世界線ノードへ——という
   * 分岐はあちらが持っているので、ここには無い。
   */
  const editRule = useCallback(
    (apply: (set: ConstraintSet) => ConstraintSet, summary: string) => {
      commit(apply, summary);
    },
    [commit]
  );

  // 図には人そのものを渡す（候補者が ObjectView として振る舞えるように）
  const staffOf = useMemo(() => {
    const byId = new Map(staffList.map((s) => [s.id, s]));
    return (id: string) => byId.get(id);
  }, [staffList]);
  const nameOf = useCallback(
    (id: string) => staffOf(id)?.name ?? id,
    [staffOf]
  );

  const handleChangeShift = useCallback(
    (shiftName: string) =>
      editRule((set) => set.setRuleShift(ruleKey, shiftName), `担当勤務帯を変更: ${shiftName}`),
    [ruleKey, editRule]
  );
  const handleChangeLabel = useCallback(
    (label: string) =>
      editRule((set) => set.setRuleLabel(ruleKey, label), `ラベルを変更: ${label}`),
    [ruleKey, editRule]
  );
  const handleChangeMinCount = useCallback(
    (minCount: number) =>
      editRule(
        (set) => set.setRuleMinCount(ruleKey, minCount),
        `最小人数を変更: ${minCount}`
      ),
    [ruleKey, editRule]
  );
  const handleRemoveStaff = useCallback(
    (staffId: string) =>
      editRule(
        (set) => set.removeLeader(ruleKey, staffId),
        `責任者候補を削除: ${nameOf(staffId)}`
      ),
    [ruleKey, editRule, nameOf]
  );
  const handleDeleteRule = useCallback(
    () => editRule((set) => set.removeRule(ruleKey), "ルール削除"),
    [ruleKey, editRule]
  );

  // 人（Staff）をドロップしたら、その人をこのルールの候補に加える
  // （＝ 制約オブジェクトの該当ルールに staffId を足して保存 → 勤務表の世界線に載る）。
  const handleDropStaffUrl = useCallback(
    (url: string) => {
      const staffId = extractIdFromUrl(url);
      if (!staffId || !rule) return;
      if (rule.leaderStaffIds.includes(staffId)) return; // 既に候補なら何もしない
      editRule(
        (set) => set.addLeader(ruleKey, staffId),
        `責任者候補を追加: ${nameOf(staffId)}`
      );
    },
    [rule, ruleKey, editRule, nameOf]
  );

  if (!rule) {
    return (
      <div style={{ padding: 16, color: "#888", fontSize: "0.85em" }}>
        ルール「{ruleKey}」が見つかりません。
      </div>
    );
  }

  return (
    <LeaderRuleDiagram
      rule={rule}
      staffOf={staffOf}
      shiftId={shiftId}
      onDropUrl={handleDropStaffUrl}
      dropAcceptTypes={[getDragType(STAFF_TYPE)]}
      shiftNames={shiftNames}
      onChangeShift={handleChangeShift}
      onChangeLabel={handleChangeLabel}
      onChangeMinCount={handleChangeMinCount}
      onRemoveStaff={handleRemoveStaff}
      onDeleteRule={handleDeleteRule}
    />
  );
};

/**
 * この勤務表の世界に入ってから中身を描く。
 * 中の useObjects / useObject は、型の membership に従ってこの世界かグローバルかを選ぶ。
 */
export const LeaderRuleView: FC<LeaderRuleViewProps> = (props) => (
  <ConstraintSetWorld constraintSetId={props.constraintSetId}>
    <LeaderRuleViewBody {...props} />
  </ConstraintSetWorld>
);
