'use client';

/**
 * ShiftPalette — シフトパレットフィーチャー
 *
 * マスターデータから Shift を取得し、パレットViewに渡す。
 * dayTypeフィルター状態を内部で管理する。
 */

import { FC, useMemo, useState } from 'react';
import { useAppSelector } from '@bublys-org/state-management';
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
} from '../slice/index.js';
import { type DayType } from '../domain/index.js';
import { createDefaultShifts } from '../data/sampleData.js';
import { ShiftPaletteView } from '../ui/ShiftPaletteView.js';

type ShiftPaletteProps = {
  shiftPlanId: string;
  initialDayType?: DayType;
};

export const ShiftPalette: FC<ShiftPaletteProps> = ({
  shiftPlanId,
  initialDayType,
}) => {
  const [filterDayType, setFilterDayType] = useState<DayType | undefined>(initialDayType);

  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  const shifts = useMemo(() => createDefaultShifts(), []);

  const assignments = useMemo(
    () => shiftPlan?.assignments.map((a) => ({
      staffId: a.staffId,
      shiftId: a.shiftId,
    })) ?? [],
    [shiftPlan],
  );

  const memberSimple = useMemo(
    () => memberList.map((m) => ({ id: m.id, isNewMember: m.isNewMember })),
    [memberList],
  );

  return (
    <ShiftPaletteView
      shifts={shifts}
      assignments={assignments}
      members={memberSimple}
      filterDayType={filterDayType}
      onSelectDayType={setFilterDayType}
    />
  );
};
