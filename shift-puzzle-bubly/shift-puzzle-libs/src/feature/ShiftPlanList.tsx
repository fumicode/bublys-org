'use client';

import { FC } from 'react';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { selectShiftPuzzlePlans, addShiftPlan, ShiftPlan } from '../slice/index.js';
import { ShiftPlanListView } from '../ui/ShiftPlanListView.js';

type ShiftPlanListProps = {
  onOpen: (planId: string) => void;
};

export const ShiftPlanList: FC<ShiftPlanListProps> = ({ onOpen }) => {
  const dispatch = useAppDispatch();
  const plans = useAppSelector(selectShiftPuzzlePlans);

  const handleCreate = (name: string, startTime: string, endTime: string) => {
    const plan = ShiftPlan.createWithSchedule(name, startTime, endTime);
    dispatch(addShiftPlan(plan.state));
  };

  return <ShiftPlanListView plans={plans} onCreate={handleCreate} onOpen={onOpen} />;
};
