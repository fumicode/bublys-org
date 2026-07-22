'use client';

import { FC, useEffect, useMemo, useRef, useState } from "react";
import {
  MonthlyStaffSchedule,
  ScheduleConstraints,
  ScheduleEditLog,
  ScheduleForecast,
  Staff,
  StaffMonthlyShiftWish,
  WorkShiftSet,
  WorkingDay,
  ScheduleAvailability,
  type ScheduleForecastIntent,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import {
  SchedulePossibilityView,
  type SchedulePossibilityItem,
} from "../ui/SchedulePossibilityView.js";
import { useObject, useObjects } from "../objects/repository.js";
import {
  commitForecastBranches,
  findCachedForecastBranches,
  localScopeId,
} from "../objects/commit.js";
import { useScheduleHistory } from "./useScheduleHistory.js";
import { buildScheduleConstraints } from "./scheduleConstraints.js";
import { decodeWishForStaff } from "./autoShift.js";
import {
  CompositeSuggestionPolicy,
  HeuristicSuggestionPolicy,
  LearnedSuggestionPolicy,
  buildScheduleForecasts,
  loadShiftPolicyWeights,
  SCHEDULE_FORECAST_VERSION,
  type ShiftPolicyWeights,
} from "./shiftSuggestion/index.js";
import { buildForecastEditLogs } from "./recordScheduleEdit.js";
import {
  STAFF_TYPE,
  STAFF_SHIFT_WISH_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  SCHEDULE_EDIT_LOG_TYPE,
} from "../objects/hotelObjects.js";

type Props = {
  scheduleId: string;
  baseNodeId: string;
  staffId: string;
  dayKey: string;
};

const INTENT_SHORT: Record<ScheduleForecastIntent, string> = {
  "constraint-safe": "制約安全",
  "wish-first": "希望優先",
  "demand-first": "必要人数優先",
};

export const SchedulePossibilityPanel: FC<Props> = ({
  scheduleId,
  baseNodeId,
  staffId,
  dayKey,
}) => {
  const store = useAppStore();
  const { scope, restore } = useScheduleHistory(scheduleId);
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const availability = useObject<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  const scheduleConstraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );
  const [weights, setWeights] = useState<
    ShiftPolicyWeights | null | undefined
  >(undefined);
  const [nodeByIntent, setNodeByIntent] = useState<
    Partial<Record<ScheduleForecastIntent, string>>
  >({});
  const generatedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadShiftPolicyWeights().then((loaded) => {
      if (!cancelled) setWeights(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const baseSchedule = useMemo(
    () =>
      scope.getObjectAt<MonthlyStaffSchedule>(
        baseNodeId,
        SCHEDULE_TYPE,
        scheduleId
      ),
    [scope, baseNodeId, scheduleId]
  );
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);
  const day = useMemo(() => WorkingDay.fromKey(dayKey), [dayKey]);
  const staffName =
    staffList.find((staff) => staff.id === staffId)?.name ?? staffId;

  const wishByStaff = useMemo(() => {
    const map = new Map<string, StaffMonthlyShiftWish>();
    if (!baseSchedule) return map;
    for (const wish of allWishes) {
      if (
        wish.year === baseSchedule.year &&
        wish.month === baseSchedule.month
      ) {
        map.set(wish.staffId, wish);
      }
    }
    return map;
  }, [allWishes, baseSchedule]);

  const shiftIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const shift of workShifts) {
      if (!map.has(shift.name)) map.set(shift.name, shift.id);
    }
    return map;
  }, [workShifts]);
  const preferenceOf = useMemo(
    () => (id: string, targetDay: WorkingDay) =>
      decodeWishForStaff(wishByStaff.get(id), targetDay, shiftIdByName),
    [wishByStaff, shiftIdByName]
  );

  const constraints = useMemo(() => {
    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    return buildScheduleConstraints({
      modelConstraints: scheduleConstraints?.modelConstraints(shiftIdsOf),
      wish: (scheduleConstraints?.checkShiftWish ?? true)
        ? { wishByStaff, shiftNameById }
        : undefined,
    });
  }, [workShifts, scheduleConstraints, wishByStaff]);

  const forecasts = useMemo(() => {
    if (!baseSchedule || weights === undefined) return [];
    const policy = new CompositeSuggestionPolicy(
      new HeuristicSuggestionPolicy(),
      weights ? new LearnedSuggestionPolicy(weights) : null
    );
    const suggestions = policy.rankCellCandidates({
      schedule: baseSchedule,
      constraints,
      staffId,
      day,
      workShifts,
      preferenceOf,
      isAvailable: availability
        ? (id, shiftId) => availability.isAllowed(id, shiftId)
        : undefined,
    });
    return buildScheduleForecasts({
      schedule: baseSchedule,
      baseNodeId,
      staffId,
      day,
      suggestions,
      constraints,
      staffList,
      workShifts,
      wishByStaff,
      availability,
      preferenceOf,
    });
  }, [
    baseSchedule,
    weights,
    constraints,
    staffId,
    day,
    workShifts,
    preferenceOf,
    availability,
    baseNodeId,
    staffList,
    wishByStaff,
  ]);

  useEffect(() => {
    if (!baseSchedule || forecasts.length === 0) return;
    const cacheKey = ScheduleForecast.cacheKey({
      scheduleId,
      baseNodeId,
      staffId,
      dayKey,
      version: SCHEDULE_FORECAST_VERSION,
    });
    const scopeId = localScopeId(SCHEDULE_TYPE, scheduleId);
    const cached = findCachedForecastBranches(
      store,
      scopeId,
      cacheKey,
      baseNodeId
    );
    if (cached.length > 0) {
      generatedFor.current = cacheKey;
      setNodeByIntent(
        Object.fromEntries(
          cached.map((branch) => [branch.intent, branch.decisionNodeId])
        )
      );
      return;
    }
    if (generatedFor.current === cacheKey) return;
    generatedFor.current = cacheKey;
    try {
      const baseLog =
        scope.getObjectAt<ScheduleEditLog>(
          baseNodeId,
          SCHEDULE_EDIT_LOG_TYPE,
          scheduleId
        ) ?? ScheduleEditLog.empty(scheduleId);
      const branches = forecasts.map((built) => {
        const label = `${staffName} ${day.day}日 ${INTENT_SHORT[built.forecast.intent]}`;
        const logs = buildForecastEditLogs(store, {
          forecast: built.forecast,
          baseSchedule,
          decisionSchedule: built.decisionSchedule,
          projectedSchedule: built.projectedSchedule,
          constraints,
          decisionLabel: label,
        });
        return {
          intent: built.forecast.intent,
          decisionLabel: label,
          forecastLabel: `${label}の見通し`,
          decisionItems: [
            { type: SCHEDULE_TYPE, obj: built.decisionSchedule },
            { type: SCHEDULE_EDIT_LOG_TYPE, obj: logs.decisionLog },
          ],
          forecastItems: [
            { type: SCHEDULE_TYPE, obj: built.projectedSchedule },
            { type: SCHEDULE_EDIT_LOG_TYPE, obj: logs.forecastLog },
          ],
        };
      });
      const committed = commitForecastBranches(
        store,
        scopeId,
        [
          { type: SCHEDULE_TYPE, obj: baseSchedule },
          { type: SCHEDULE_EDIT_LOG_TYPE, obj: baseLog },
        ],
        cacheKey,
        branches,
        baseNodeId
      );
      setNodeByIntent(
        Object.fromEntries(
          committed.branches.map((branch) => [
            branch.intent,
            branch.decisionNodeId,
          ])
        )
      );
    } catch {
      generatedFor.current = null;
      setNodeByIntent({});
    }
  }, [
    baseSchedule,
    forecasts,
    scope,
    baseNodeId,
    scheduleId,
    staffId,
    dayKey,
    staffName,
    day,
    constraints,
    store,
  ]);

  const items: SchedulePossibilityItem[] = forecasts.map((built) => ({
    forecast: built.forecast,
    decisionNodeId: nodeByIntent[built.forecast.intent],
  }));

  if (!baseSchedule) {
    return <div style={{ padding: 16 }}>元の世界線を読み込めませんでした。</div>;
  }
  if (weights === undefined) {
    return <div style={{ padding: 16 }}>未来の分岐を考えています…</div>;
  }

  return (
    <SchedulePossibilityView
      staffName={staffName}
      dayLabel={`${day.day}日`}
      items={items}
      shiftNameOf={(shiftId) =>
        workShifts.find((shift) => shift.id === shiftId)?.name ?? shiftId
      }
      onChoose={(item) => {
        if (item.decisionNodeId) restore(item.decisionNodeId);
      }}
    />
  );
};
