'use client';

import { FC, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { selectShiftPuzzlePlans, addShiftPlan, deleteShiftPlan, ShiftPlan } from '../slice/index.js';
import { ShiftPlanListView } from '../ui/ShiftPlanListView.js';

type ShiftPlanListProps = {
  onOpen: (planId: string) => void;
};

export const ShiftPlanList: FC<ShiftPlanListProps> = ({ onOpen }) => {
  const dispatch = useAppDispatch();
  const plans = useAppSelector(selectShiftPuzzlePlans);

  useEffect(() => {
    plans.filter((p) => !p.date).forEach((p) => dispatch(deleteShiftPlan(p.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = (name: string, date: string, startTime: string, endTime: string) => {
    const plan = ShiftPlan.createWithSchedule(name, date, startTime, endTime);
    dispatch(addShiftPlan(plan.state));
  };

  return <ShiftPlanListView plans={plans} onCreate={handleCreate} onOpen={onOpen} />;
};
