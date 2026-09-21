'use client';

import { FC } from "react";
import { ConstraintLimitView } from "../ui/ConstraintLimitView.js";
import { limitSpecOf } from "../ui/constraint-icons/limitSpecs.js";
import { ConstraintSetWorld } from "./ConstraintSetWorld.js";
import { useConstraintSetEditor } from "./useConstraintSetEditor.js";

type ConstraintLimitBubbleViewProps = {
  /** どの制約セットか（"global" か scheduleId） */
  constraintSetId?: string;
  /** どの制約か（limitSpecs の固定スラッグ） */
  limitKey: string;
};

/**
 * 「数と真偽で言い切れる制約」1つを開くバブルの中身。
 * 連勤・休日・休み上限・希望のどれであっても、このファイルは変わらない
 * （違いは limitSpecs の1行だけにしてある）。
 */
const ConstraintLimitBubbleViewBody: FC<ConstraintLimitBubbleViewProps> = ({
  constraintSetId,
  limitKey,
}) => {
  const { constraintSet, canEdit, commit } =
    useConstraintSetEditor(constraintSetId);
  const spec = limitSpecOf(limitKey);

  if (!spec) {
    return (
      <div style={{ padding: 16, color: "#888", fontSize: "0.85em" }}>
        制約「{limitKey}」が見つかりません。
      </div>
    );
  }

  if (!constraintSet) {
    return (
      <div style={{ padding: 16, color: "#888", fontSize: "0.85em" }}>
        制約セットを読み込み中…
      </div>
    );
  }

  return (
    <ConstraintLimitView
      spec={spec}
      value={spec.read(constraintSet)}
      // 読めないだけのものを上書きしないよう、揃うまでは入力欄を出さない
      onCommit={
        canEdit
          ? (value) => commit((set) => spec.apply(set, value), spec.summary(value))
          : undefined
      }
    />
  );
};

/**
 * その制約セットの世界に入ってから中身を描く。
 * グローバルのテンプレートは世界を持たないので、判定は ConstraintSetWorld に任せる。
 */
export const ConstraintLimitBubbleView: FC<ConstraintLimitBubbleViewProps> = (
  props
) => (
  <ConstraintSetWorld constraintSetId={props.constraintSetId}>
    <ConstraintLimitBubbleViewBody {...props} />
  </ConstraintSetWorld>
);
