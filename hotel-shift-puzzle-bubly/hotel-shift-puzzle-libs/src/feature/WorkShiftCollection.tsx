'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import {
  WorkShift,
  WorkShiftSet,
  createDefaultWorkShiftSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import { WorkShiftListView } from "../ui/WorkShiftListView.js";
import { useObjectShell, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import {
  WORKSHIFT_SET_TYPE,
  GLOBAL_WORKSHIFT_SET_ID,
} from "../objects/hotelObjects.js";

/** 新しい勤務帯の ID を生成する */
const newWorkShiftId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `shift-${Date.now()}`;

/**
 * グローバルの勤務帯セット（テンプレート）を編集するバブル。
 * ここで整えた勤務帯が、勤務表作成時にコピーされて各勤務表の独自セットになる。
 * 集約（WorkShiftSet）をシェル経由で編集する（ソートはセットが担保）。
 */
export const WorkShiftCollection: FC = () => {
  useSeedHotelData();
  const { object: set, update } = useObjectShell<WorkShiftSet>(
    WORKSHIFT_SET_TYPE,
    GLOBAL_WORKSHIFT_SET_ID
  );
  const repo = useObjectRepo<WorkShiftSet>(WORKSHIFT_SET_TYPE);

  // 無ければ既定のグローバルセットをその場で用意する
  useEffect(() => {
    if (!set) repo.save(createDefaultWorkShiftSet(GLOBAL_WORKSHIFT_SET_ID));
  }, [set, repo]);

  const shifts = set?.shifts ?? [];

  // 勤務帯の追加／編集を確定する（フォームの ✅ 押下時に1回だけ呼ばれる → 保存も1回）。
  const handleCommitShift = (
    id: string | null,
    draft: { name: string; hour: number }
  ) => {
    const name = draft.name.trim() || "新しい勤務帯";
    if (id === null) {
      update((s) => s.addShift(WorkShift.of(newWorkShiftId(), name, { hour: draft.hour })));
    } else {
      // 改名と時刻変更をまとめて1インスタンスにして保存（1コミット）
      update((s) => s.rename(id, name).changeStart(id, { hour: draft.hour }));
    }
  };

  const handleRemove = (id: string) => update((s) => s.remove(id));

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>勤務帯 ({shifts.length})</h3>
      </div>
      <WorkShiftListView
        workShifts={shifts}
        onCommitShift={handleCommitShift}
        onRemove={handleRemove}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    margin-bottom: 4px;

    h3 {
      margin: 0;
    }
  }
`;
