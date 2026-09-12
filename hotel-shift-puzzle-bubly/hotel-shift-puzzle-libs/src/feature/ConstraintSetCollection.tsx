'use client';

import { FC, useEffect, useMemo } from "react";
import styled from "styled-components";
import {
  ConstraintSet,
  ShiftLeaderRule,
  WorkShiftSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ConstraintSetView } from "../ui/ConstraintSetView.js";
import {
  ScheduleConstraintsBar,
  shiftColorOfNames,
} from "../ui/ScheduleConstraintsBar.js";
import {
  useObject,
  useObjectShell,
  useObjectRepo,
  useObjectsPending,
} from "../objects/repository.js";
import {
  CONSTRAINT_SET_TYPE,
  GLOBAL_CONSTRAINT_SET_ID,
  WORKSHIFT_SET_TYPE,
  GLOBAL_WORKSHIFT_SET_ID,
} from "../objects/hotelObjects.js";

/** 新しい責任者ルールのキーを生成する（採番は feature 層の仕事） */
const newRuleKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `rule-${Date.now()}`;

/**
 * グローバルの制約セット（テンプレート）を編集するバブル。
 * ここで整えた責任者ルール・上限が、勤務表作成時にコピーされて各勤務表の独自セットになる
 * （勤務帯セットと同じ流儀）。
 *
 * 責任者の担当者はここでは決めない。担当者は名簿のスタッフを指すが、名簿は勤務表が
 * 生まれるときに焼き付けられる（固定メンバー）ので、誰が担うかは勤務表ごとの話になる。
 *
 * 上には勤務表と**同じ** ScheduleConstraintsBar を出す。同じ制約セットなのだから同じ絵で
 * 読めるべきで、グローバル用の似たバーを別に作らない。勤務表固有の prop
 * （担当者名・選択状態・ルールバブルURL・バーの＋）は渡さない＝ただの図として並ぶ。
 * 直すのは下のフォームで、直した瞬間に上の絵が変わる。
 */
export const ConstraintSetCollection: FC = () => {
  const { object: constraintSet, update } = useObjectShell<ConstraintSet>(
    CONSTRAINT_SET_TYPE,
    GLOBAL_CONSTRAINT_SET_ID
  );
  const repo = useObjectRepo<ConstraintSet>(CONSTRAINT_SET_TYPE);
  // 責任者ルールの「担当勤務帯」の選択肢は、グローバルの勤務帯セットの名前から
  const workShiftSet = useObject<WorkShiftSet>(
    WORKSHIFT_SET_TYPE,
    GLOBAL_WORKSHIFT_SET_ID
  );
  const shiftNames = [...new Set((workShiftSet?.shifts ?? []).map((w) => w.name))];
  // 責任者アイコンを担当勤務帯の色で塗る（勤務表と同じ解決を使う）
  const shiftColorOf = useMemo(
    () => shiftColorOfNames(workShiftSet?.shifts ?? []),
    [workShiftSet]
  );

  // 無ければ既定のグローバルセットをその場で用意する。
  // 状態が揃うまでは動かさない（追い出されただけのセットを既定で上書きしないため）。
  const pending = useObjectsPending();
  useEffect(() => {
    if (pending) return;
    if (!constraintSet) repo.save(ConstraintSet.empty(GLOBAL_CONSTRAINT_SET_ID));
  }, [pending, constraintSet, repo]);

  if (!constraintSet) {
    return <div style={{ padding: 16, color: "#666" }}>読み込み中…</div>;
  }

  const handleAddRule = () =>
    update((c) =>
      c.addRule(
        new ShiftLeaderRule({
          key: newRuleKey(),
          label: "新しい責任者",
          shiftName: shiftNames[0] ?? "",
          leaderStaffIds: [],
          minCount: 1,
        })
      )
    );

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>制約セット</h3>
      </div>
      <div className="e-bar">
        <ScheduleConstraintsBar
          leaderRules={constraintSet.leaderRules}
          intervalRules={constraintSet.shiftIntervalRules}
          shiftColorOf={shiftColorOf}
          maxConsecutive={constraintSet.maxConsecutiveWorkdays}
          minDayOff={constraintSet.minMonthlyDayOff}
          maxPerDay={constraintSet.maxDayOffPerDay}
          checkShiftWish={constraintSet.checkShiftWish}
        />
      </div>
      <ConstraintSetView
        constraintSet={constraintSet}
        shiftNames={shiftNames}
        onChangeMaxConsecutiveWorkdays={(days) =>
          update((c) => c.withMaxConsecutiveWorkdays(days))
        }
        onChangeMinMonthlyDayOff={(days) => update((c) => c.withMinMonthlyDayOff(days))}
        onChangeMaxDayOffPerDay={(count) => update((c) => c.withMaxDayOffPerDay(count))}
        onChangeCheckShiftWish={(check) => update((c) => c.withCheckShiftWish(check))}
        onAddRule={handleAddRule}
        onRemoveRule={(key) => update((c) => c.removeRule(key))}
        onChangeRuleLabel={(key, label) =>
          update((c) => (label ? c.setRuleLabel(key, label) : c))
        }
        onChangeRuleShift={(key, shiftName) =>
          update((c) => c.setRuleShift(key, shiftName))
        }
        onChangeRuleMinCount={(key, minCount) =>
          update((c) => c.setRuleMinCount(key, minCount))
        }
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;

  .e-header {
    margin-bottom: 4px;

    h3 {
      margin: 0;
    }
  }

  /* 「いま何が効いているか」の図。下のフォームを直すとここが変わる */
  .e-bar {
    margin-bottom: 8px;
  }
`;
