'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import { ConstraintSet, ShiftLeaderRule } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleConstraintsBar } from "../ui/ScheduleConstraintsBar.js";
import { useObjectRepo, useObjectsPending } from "../objects/repository.js";
import {
  CONSTRAINT_SET_TYPE,
  GLOBAL_CONSTRAINT_SET_ID,
} from "../objects/hotelObjects.js";
import { useConstraintSetEditor } from "./useConstraintSetEditor.js";

/** 新しい責任者ルールのキーを生成する（採番は feature 層の仕事） */
const newRuleKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `rule-${Date.now()}`;

type ConstraintSetCollectionProps = {
  /**
   * 制約1つぶんのバブル URL を作る。アイコンをダブルクリックすると開く。
   * URL スキームは app 層の関心事なので注入で受ける。
   */
  bubbleUrlOf?: (
    kind: "leaderRule" | "shiftInterval" | "limit",
    key: string
  ) => string;
};

/**
 * グローバルの制約セット（テンプレート）バブル。
 * ここで整えた責任者ルール・上限が、勤務表作成時にコピーされて各勤務表の独自セットになる
 * （勤務帯セットと同じ流儀）。
 *
 * **中身は勤務表の上と同じアイコンのバーだけ。** どの制約もダブルクリックで自分のバブルが
 * 開き、そこで直す。ここにフォームを置くと、同じ値を直す口が2つになる。
 *
 * 責任者の担当者はここでは決めない。担当者は名簿のスタッフを指すが、名簿は勤務表が
 * 生まれるときに焼き付けられる（固定メンバー）ので、誰が担うかは勤務表ごとの話になる。
 */
export const ConstraintSetCollection: FC<ConstraintSetCollectionProps> = ({
  bubbleUrlOf,
}) => {
  const { constraintSet, shiftNames, shiftColorOf, commit } =
    useConstraintSetEditor(GLOBAL_CONSTRAINT_SET_ID);
  const repo = useObjectRepo<ConstraintSet>(CONSTRAINT_SET_TYPE);

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

  const handleAddRule = () => {
    const rule = new ShiftLeaderRule({
      key: newRuleKey(),
      label: "新しい責任者",
      shiftName: shiftNames[0] ?? "",
      leaderStaffIds: [],
      minCount: 1,
    });
    commit((set) => set.addRule(rule), `責任者ルール「${rule.label}」を追加`);
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>制約セット</h3>
      </div>
      <ScheduleConstraintsBar
        constraintSet={constraintSet}
        shiftColorOf={shiftColorOf}
        bubbleUrlOf={bubbleUrlOf}
        onAddRule={handleAddRule}
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
`;
