'use client';

import { FC, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { selectShiftPuzzlePlans, addShiftPlan, deleteShiftPlan, updateShiftPlan, ShiftPlan } from '../slice/index.js';
import { ShiftPlanListView } from '../ui/ShiftPlanListView.js';
import { shiftsForDate, timeSchedulesForDate } from '../data/sampleData.js';

type ShiftPlanListProps = {
  onOpen: (planId: string) => void;
};

export const ShiftPlanList: FC<ShiftPlanListProps> = ({ onOpen }) => {
  const dispatch = useAppDispatch();
  const plans = useAppSelector(selectShiftPuzzlePlans);

  useEffect(() => {
    plans.filter((p) => !p.date).forEach((p) => dispatch(deleteShiftPlan(p.id)));

    // Migrate plans that were created before master shifts were populated.
    // These plans have a valid festival date but shifts: [] — populate from master data.
    plans
      .filter((p) => p.date && p.shifts.length === 0)
      .forEach((p) => {
        const masterShifts = shiftsForDate(p.date);
        const masterTimeSchedules = timeSchedulesForDate(p.date);
        if (masterShifts.length === 0) return;
        dispatch(updateShiftPlan({
          ...p.state,
          shifts: masterShifts.map((s) => s.state),
          timeSchedules: masterTimeSchedules.map((ts) => ts.state),
          updatedAt: new Date().toISOString(),
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = (name: string, date: string, startTime: string, endTime: string) => {
    const masterShifts = shiftsForDate(date);
    const masterTimeSchedules = timeSchedulesForDate(date);
    const plan = masterShifts.length > 0
      ? ShiftPlan.createFromWorldLine(name, date, masterShifts.map((s) => s.state), masterTimeSchedules.map((ts) => ts.state))
      : ShiftPlan.createWithSchedule(name, date, startTime, endTime);
    dispatch(addShiftPlan(plan.state));
  };

  const handleDelete = (planId: string) => {
    dispatch(deleteShiftPlan(planId));
  };

  return <ShiftPlanListView plans={plans} onCreate={handleCreate} onOpen={onOpen} onDelete={handleDelete} />;
};
