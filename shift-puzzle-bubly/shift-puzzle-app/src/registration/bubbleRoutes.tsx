"use client";

import { useEffect } from "react";
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  ShiftPlanGanttEditor,
  selectEvents,
  selectCurrentEventId,
  selectCurrentShiftPlanId,
  addEvent,
  setMembersForEvent,
  setRolesForEvent,
  setTimeSlotsForEvent,
  addShiftPlan,
  setCurrentEventId,
  setCurrentShiftPlanId,
} from "@bublys-org/shift-puzzle-libs";
import type {
  EventJSON,
  MemberJSON,
  RoleJSON,
  TimeSlotJSON,
  ShiftPlanJSON,
} from "@bublys-org/shift-puzzle-model";

const DEMO_EVENT_ID = "demo-event-001";
const DEMO_PLAN_ID = "demo-plan-001";
const SEED_TIMESTAMP = "2024-11-01T00:00:00.000Z";

function createDemoData(): {
  event: EventJSON;
  members: MemberJSON[];
  roles: RoleJSON[];
  timeSlots: TimeSlotJSON[];
  shiftPlan: ShiftPlanJSON;
} {
  const event: EventJSON = {
    id: DEMO_EVENT_ID,
    name: "デモイベント 2024",
    description: "シフトパズルのデモ用イベント",
    startDate: "2024-11-01",
    endDate: "2024-11-01",
    timezone: "Asia/Tokyo",
    skillDefinitions: [],
    defaultSlotDuration: 60,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };

  const timeSlots: TimeSlotJSON[] = [
    { id: "ts-001", dayIndex: 0, startMinute: 9 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
    { id: "ts-002", dayIndex: 0, startMinute: 10 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
    { id: "ts-003", dayIndex: 0, startMinute: 11 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
    { id: "ts-004", dayIndex: 0, startMinute: 12 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
    { id: "ts-005", dayIndex: 0, startMinute: 13 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
    { id: "ts-006", dayIndex: 0, startMinute: 14 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
    { id: "ts-007", dayIndex: 0, startMinute: 15 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
    { id: "ts-008", dayIndex: 0, startMinute: 16 * 60, durationMinutes: 60, eventId: DEMO_EVENT_ID },
  ];

  const members: MemberJSON[] = [
    {
      id: "m-001",
      name: "田中 太郎",
      eventId: DEMO_EVENT_ID,
      tags: ["一般"],
      skills: [],
      availableSlotIds: ["ts-001", "ts-002", "ts-003", "ts-004", "ts-005", "ts-006", "ts-007", "ts-008"],
      memo: "",
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: "m-002",
      name: "佐藤 花子",
      eventId: DEMO_EVENT_ID,
      tags: ["一般"],
      skills: [],
      availableSlotIds: ["ts-001", "ts-002", "ts-003", "ts-004"],
      memo: "",
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: "m-003",
      name: "鈴木 次郎",
      eventId: DEMO_EVENT_ID,
      tags: ["リーダー"],
      skills: [],
      availableSlotIds: ["ts-005", "ts-006", "ts-007", "ts-008"],
      memo: "",
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: "m-004",
      name: "高橋 美咲",
      eventId: DEMO_EVENT_ID,
      tags: ["一般"],
      skills: [],
      availableSlotIds: ["ts-002", "ts-003", "ts-006", "ts-007"],
      memo: "",
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: "m-005",
      name: "中村 健一",
      eventId: DEMO_EVENT_ID,
      tags: ["一般"],
      skills: [],
      availableSlotIds: ["ts-001", "ts-004", "ts-005", "ts-008"],
      memo: "",
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  const roles: RoleJSON[] = [
    {
      id: "r-001",
      name: "受付",
      description: "来場者の受付対応",
      requiredSkillIds: [],
      minRequired: 2,
      maxRequired: 3,
      color: "#4caf50",
      eventId: DEMO_EVENT_ID,
    },
    {
      id: "r-002",
      name: "案内",
      description: "会場・展示の案内",
      requiredSkillIds: [],
      minRequired: 1,
      maxRequired: 2,
      color: "#2196f3",
      eventId: DEMO_EVENT_ID,
    },
    {
      id: "r-003",
      name: "司会",
      description: "セッションの進行",
      requiredSkillIds: [],
      minRequired: 1,
      maxRequired: 1,
      color: "#ff9800",
      eventId: DEMO_EVENT_ID,
    },
  ];

  const shiftPlan: ShiftPlanJSON = {
    id: DEMO_PLAN_ID,
    name: "シフト案 A",
    scenarioLabel: "標準版",
    assignments: [],
    eventId: DEMO_EVENT_ID,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };

  return { event, members, roles, timeSlots, shiftPlan };
}

const ShiftPuzzleEditorBubble: BubbleRoute["Component"] = () => {
  const dispatch = useAppDispatch();
  const events = useAppSelector(selectEvents);
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);

  useEffect(() => {
    if (events.length === 0) {
      const { event, members, roles, timeSlots, shiftPlan } = createDemoData();
      dispatch(addEvent(event));
      dispatch(setMembersForEvent({ eventId: event.id, members }));
      dispatch(setRolesForEvent({ eventId: event.id, roles }));
      dispatch(setTimeSlotsForEvent({ eventId: event.id, timeSlots }));
      dispatch(addShiftPlan(shiftPlan));
      dispatch(setCurrentEventId(event.id));
      dispatch(setCurrentShiftPlanId(shiftPlan.id));
    }
  }, [dispatch, events.length]);

  if (!currentEventId || !currentShiftPlanId) {
    return <div style={{ padding: 24, color: "#666" }}>データを初期化中...</div>;
  }

  return (
    <ShiftPlanGanttEditor
      shiftPlanId={currentShiftPlanId}
      eventId={currentEventId}
    />
  );
};

export const shiftPuzzleBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "shift-puzzle/editor",
    type: "shift-puzzle-editor",
    Component: ShiftPuzzleEditorBubble,
  },
];
