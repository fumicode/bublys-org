import { createSlice, createSelector, type WithSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { rootReducer, type RootState } from '@bublys-org/state-management';
import {
  Member,
  Role,
  ShiftPlan,
  Assignment,
  Event,
  ConstraintChecker,
  type EventJSON,
  type MemberJSON,
  type RoleJSON,
  type TimeSlotJSON,
  type ShiftPlanJSON,
  type AssignmentJSON,
  type AssignmentReasonState,
  type ConstraintViolation,
} from '@bublys-org/shift-puzzle-model';

// ========== State ==========

type ShiftPuzzleMainState = {
  events: EventJSON[];
  members: MemberJSON[];
  roles: RoleJSON[];
  timeSlots: TimeSlotJSON[];
  shiftPlans: ShiftPlanJSON[];
  currentEventId: string | null;
  currentShiftPlanId: string | null;
  /** ガントチャートUI設定 */
  ganttHourPx: number;
  ganttAxisMode: 'role' | 'member';
  /** ガントチャートで表示するdayIndex */
  ganttDayIndex: number;
};

const initialState: ShiftPuzzleMainState = {
  events: [],
  members: [],
  roles: [],
  timeSlots: [],
  shiftPlans: [],
  currentEventId: null,
  currentShiftPlanId: null,
  ganttHourPx: 80,
  ganttAxisMode: 'role',
  ganttDayIndex: 0,
};

// ========== Helper ==========

function toMutableShiftPlan(plan: ShiftPlanJSON) {
  return {
    ...plan,
    assignments: [...plan.assignments],
  };
}

// ========== Slice ==========

export const shiftPuzzleMainSlice = createSlice({
  name: 'shiftPuzzleMain',
  initialState,
  reducers: {
    // --- Events ---
    addEvent: (state, action: PayloadAction<EventJSON>) => {
      state.events.push(action.payload);
    },
    updateEvent: (state, action: PayloadAction<EventJSON>) => {
      const idx = state.events.findIndex((e) => e.id === action.payload.id);
      if (idx !== -1) state.events[idx] = action.payload;
    },
    deleteEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter((e) => e.id !== action.payload);
      if (state.currentEventId === action.payload) state.currentEventId = null;
    },
    setCurrentEventId: (state, action: PayloadAction<string | null>) => {
      state.currentEventId = action.payload;
    },

    // --- Members ---
    addMember: (state, action: PayloadAction<MemberJSON>) => {
      state.members.push(action.payload);
    },
    updateMember: (state, action: PayloadAction<MemberJSON>) => {
      const idx = state.members.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) state.members[idx] = action.payload;
    },
    deleteMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter((m) => m.id !== action.payload);
    },
    setMembersForEvent: (state, action: PayloadAction<{ eventId: string; members: MemberJSON[] }>) => {
      state.members = [
        ...state.members.filter((m) => m.eventId !== action.payload.eventId),
        ...action.payload.members,
      ];
    },

    // --- Roles ---
    addRole: (state, action: PayloadAction<RoleJSON>) => {
      state.roles.push(action.payload);
    },
    updateRole: (state, action: PayloadAction<RoleJSON>) => {
      const idx = state.roles.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) state.roles[idx] = action.payload;
    },
    deleteRole: (state, action: PayloadAction<string>) => {
      state.roles = state.roles.filter((r) => r.id !== action.payload);
    },
    setRolesForEvent: (state, action: PayloadAction<{ eventId: string; roles: RoleJSON[] }>) => {
      state.roles = [
        ...state.roles.filter((r) => r.eventId !== action.payload.eventId),
        ...action.payload.roles,
      ];
    },

    // --- TimeSlots ---
    setTimeSlotsForEvent: (state, action: PayloadAction<{ eventId: string; timeSlots: TimeSlotJSON[] }>) => {
      state.timeSlots = [
        ...state.timeSlots.filter((s) => s.eventId !== action.payload.eventId),
        ...action.payload.timeSlots,
      ];
    },
    addTimeSlots: (state, action: PayloadAction<TimeSlotJSON[]>) => {
      state.timeSlots.push(...action.payload);
    },

    // --- ShiftPlans ---
    addShiftPlan: (state, action: PayloadAction<ShiftPlanJSON>) => {
      state.shiftPlans.push(toMutableShiftPlan(action.payload));
    },
    updateShiftPlan: (state, action: PayloadAction<ShiftPlanJSON>) => {
      const idx = state.shiftPlans.findIndex((p) => p.id === action.payload.id);
      if (idx !== -1) state.shiftPlans[idx] = toMutableShiftPlan(action.payload);
    },
    deleteShiftPlan: (state, action: PayloadAction<string>) => {
      state.shiftPlans = state.shiftPlans.filter((p) => p.id !== action.payload);
      if (state.currentShiftPlanId === action.payload) {
        state.currentShiftPlanId = state.shiftPlans[0]?.id ?? null;
      }
    },
    setCurrentShiftPlanId: (state, action: PayloadAction<string | null>) => {
      state.currentShiftPlanId = action.payload;
    },

    // --- Assignments（ShiftPlan内の配置を直接操作） ---
    addAssignment: (
      state,
      action: PayloadAction<{ shiftPlanId: string; assignment: AssignmentJSON }>
    ) => {
      const plan = state.shiftPlans.find((p) => p.id === action.payload.shiftPlanId);
      if (plan) plan.assignments.push(action.payload.assignment);
    },
    removeAssignment: (
      state,
      action: PayloadAction<{ shiftPlanId: string; assignmentId: string }>
    ) => {
      const plan = state.shiftPlans.find((p) => p.id === action.payload.shiftPlanId);
      if (plan) {
        plan.assignments = plan.assignments.filter(
          (a) => a.id !== action.payload.assignmentId
        );
      }
    },
    moveAssignment: (
      state,
      action: PayloadAction<{ shiftPlanId: string; assignmentId: string; newTimeSlotId: string }>
    ) => {
      const plan = state.shiftPlans.find((p) => p.id === action.payload.shiftPlanId);
      if (!plan) return;
      const assignment = plan.assignments.find((a) => a.id === action.payload.assignmentId);
      if (assignment) {
        (assignment as AssignmentJSON).timeSlotId = action.payload.newTimeSlotId;
        (assignment as AssignmentJSON).updatedAt = new Date().toISOString();
      }
    },
    updateAssignmentReason: (
      state,
      action: PayloadAction<{
        shiftPlanId: string;
        assignmentId: string;
        reason: AssignmentReasonState;
      }>
    ) => {
      const plan = state.shiftPlans.find((p) => p.id === action.payload.shiftPlanId);
      if (!plan) return;
      const assignment = plan.assignments.find((a) => a.id === action.payload.assignmentId);
      if (assignment) {
        (assignment as AssignmentJSON).reason = action.payload.reason;
        (assignment as AssignmentJSON).updatedAt = new Date().toISOString();
      }
    },

    // --- UI設定 ---
    setGanttHourPx: (state, action: PayloadAction<number>) => {
      state.ganttHourPx = Math.max(40, Math.min(120, action.payload));
    },
    setGanttAxisMode: (state, action: PayloadAction<'role' | 'member'>) => {
      state.ganttAxisMode = action.payload;
    },
    setGanttDayIndex: (state, action: PayloadAction<number>) => {
      state.ganttDayIndex = action.payload;
    },
  },
});

export const {
  addEvent, updateEvent, deleteEvent, setCurrentEventId,
  addMember, updateMember, deleteMember, setMembersForEvent,
  addRole, updateRole, deleteRole, setRolesForEvent,
  setTimeSlotsForEvent, addTimeSlots,
  addShiftPlan, updateShiftPlan, deleteShiftPlan, setCurrentShiftPlanId,
  addAssignment, removeAssignment, moveAssignment, updateAssignmentReason,
  setGanttHourPx, setGanttAxisMode, setGanttDayIndex,
} = shiftPuzzleMainSlice.actions;

// LazyLoadedSlicesを拡張
declare module '@bublys-org/state-management' {
  export interface LazyLoadedSlices extends WithSlice<typeof shiftPuzzleMainSlice> {}
}

// rootReducerに注入
shiftPuzzleMainSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithShiftPuzzleMain = RootState & { shiftPuzzleMain: ShiftPuzzleMainState };

const selectSlice = (state: StateWithShiftPuzzleMain): ShiftPuzzleMainState =>
  state.shiftPuzzleMain ?? initialState;

// --- Events ---
export const selectEvents = createSelector(
  [selectSlice],
  (s) => s.events
);
export const selectCurrentEventId = (state: StateWithShiftPuzzleMain) =>
  selectSlice(state).currentEventId;
export const selectCurrentEvent = createSelector([selectSlice], (s) =>
  s.events.find((e) => e.id === s.currentEventId) ?? null
);
export const selectEventById = (id: string) =>
  createSelector([selectSlice], (s) => {
    const json = s.events.find((e) => e.id === id);
    return json ? new Event(json) : undefined;
  });

// --- Members ---
export const selectMembersForEvent = (eventId: string) =>
  createSelector([selectSlice], (s) =>
    s.members.filter((m) => m.eventId === eventId).map((m) => new Member(m))
  );

// --- Roles ---
export const selectRolesForEvent = (eventId: string) =>
  createSelector([selectSlice], (s) =>
    s.roles.filter((r) => r.eventId === eventId).map((r) => new Role(r))
  );

// --- TimeSlots ---
export const selectTimeSlotsForEvent = (eventId: string) =>
  createSelector([selectSlice], (s) =>
    s.timeSlots.filter((ts) => ts.eventId === eventId)
  );

// --- ShiftPlans ---
export const selectShiftPlans = createSelector([selectSlice], (s) =>
  s.shiftPlans.map((p) => new ShiftPlan(p))
);
export const selectCurrentShiftPlanId = (state: StateWithShiftPuzzleMain) =>
  selectSlice(state).currentShiftPlanId;
export const selectShiftPlanById = (id: string) =>
  createSelector([selectSlice], (s) => {
    const json = s.shiftPlans.find((p) => p.id === id);
    return json ? new ShiftPlan(json) : undefined;
  });
export const selectCurrentShiftPlan = createSelector([selectSlice], (s) => {
  const id = s.currentShiftPlanId;
  if (!id) return undefined;
  const json = s.shiftPlans.find((p) => p.id === id);
  return json ? new ShiftPlan(json) : undefined;
});

// --- Assignments ---
export const selectAssignmentsForPlan = (planId: string) =>
  createSelector([selectSlice], (s) => {
    const plan = s.shiftPlans.find((p) => p.id === planId);
    return (plan?.assignments ?? []).map((a) => new Assignment(a));
  });

// --- 制約違反（computed） ---
export const selectViolationsForPlan = (planId: string, eventId: string) =>
  createSelector([selectSlice], (s): ConstraintViolation[] => {
    const plan = s.shiftPlans.find((p) => p.id === planId);
    if (!plan) return [];
    const members = s.members.filter((m) => m.eventId === eventId);
    const roles = s.roles.filter((r) => r.eventId === eventId);
    const timeSlots = s.timeSlots.filter((ts) => ts.eventId === eventId);
    const checker = ConstraintChecker.create(
      plan.assignments,
      members,
      roles,
      timeSlots
    );
    return checker.computeViolations();
  });

// --- UI設定 ---
export const selectGanttHourPx = (state: StateWithShiftPuzzleMain) =>
  selectSlice(state).ganttHourPx;
export const selectGanttAxisMode = (state: StateWithShiftPuzzleMain) =>
  selectSlice(state).ganttAxisMode;
export const selectGanttDayIndex = (state: StateWithShiftPuzzleMain) =>
  selectSlice(state).ganttDayIndex;
