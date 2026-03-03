"use client";

import { useContext, useEffect } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  ShiftPlanGanttEditor,
  ReasonListFeature,
  MemberCollection,
  MemberDetailFeature,
  RoleFulfillmentFeature,
  ShiftPlanSummary,
  EventListFeature,
  EventDetailFeature,
  RoleListFeature,
  ShiftPlanManager,
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
  setMemberFilter,
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

const ShiftPuzzleEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
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

  const eventId = currentEventId;
  const planId = currentShiftPlanId;

  const handleCellClick = (rowId: string, timeSlotId: string, mode: "role" | "member") => {
    if (mode === "role") {
      dispatch(setMemberFilter({ availableAtSlotId: timeSlotId }));
      openBubble(`shift-puzzle/events/${eventId}/members`, bubble.id, "bubble-side");
    } else {
      openBubble(`shift-puzzle/events/${eventId}/roles`, bubble.id, "bubble-side");
    }
  };

  const handleAssignmentClick = (_assignmentId: string, memberId: string, _roleId: string) => {
    openBubble(
      `shift-puzzle/events/${eventId}/shift-plans/${planId}/member/${memberId}`,
      bubble.id,
      "bubble-side"
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ShiftPlanGanttEditor
          shiftPlanId={planId}
          eventId={eventId}
          onCellClick={handleCellClick}
          onAssignmentClick={handleAssignmentClick}
        />
      </div>
    </div>
  );
};

/** F-3-3: 配置理由一覧バブル */
const ReasonListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);

  // URL パラメータ優先、なければ Redux の現在選択状態を使用
  const eventId = bubble.params.eventId ?? currentEventId;
  const planId = bubble.params.planId ?? currentShiftPlanId;

  if (!eventId || !planId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        イベントまたはシフト案が選択されていません
      </div>
    );
  }

  return <ReasonListFeature shiftPlanId={planId} eventId={eventId} />;
};

/** F-1-1〜F-1-4: メンバー一覧バブル（F-4-1: タップで詳細バブルを開く） */
const MemberListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);
  const eventId = bubble.params.eventId ?? currentEventId;

  if (!eventId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        イベントが選択されていません
      </div>
    );
  }

  const handleMemberTap = (memberId: string) => {
    const planId = currentShiftPlanId;
    const url = planId
      ? `shift-puzzle/events/${eventId}/shift-plans/${planId}/member/${memberId}`
      : `shift-puzzle/events/${eventId}/members/${memberId}`;
    openBubble(url, bubble.id);
  };

  return <MemberCollection eventId={eventId} onMemberTap={handleMemberTap} />;
};

/** F-4-1: メンバー詳細バブル */
const MemberDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);

  const eventId = bubble.params.eventId ?? currentEventId;
  const memberId = bubble.params.memberId;
  const planId = bubble.params.planId ?? currentShiftPlanId;

  if (!eventId || !memberId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        メンバー情報が指定されていません
      </div>
    );
  }

  return (
    <MemberDetailFeature
      eventId={eventId}
      memberId={memberId}
      shiftPlanId={planId ?? undefined}
    />
  );
};

/** F-4-2: 役割詳細バブル（イベントレベル） */
const RoleDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);

  const eventId = bubble.params.eventId ?? currentEventId;
  const roleId = bubble.params.roleId;
  const planId = currentShiftPlanId;

  if (!eventId || !roleId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        役割情報が指定されていません
      </div>
    );
  }

  return (
    <RoleFulfillmentFeature
      eventId={eventId}
      roleId={roleId}
      shiftPlanId={planId ?? undefined}
    />
  );
};

/** F-4-2: 役割充足詳細バブル（シフト案レベル） */
const RoleFulfillmentBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);

  const eventId = bubble.params.eventId ?? currentEventId;
  const planId = bubble.params.planId ?? currentShiftPlanId;
  const roleId = bubble.params.roleId;

  if (!eventId || !roleId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        役割情報が指定されていません
      </div>
    );
  }

  return (
    <RoleFulfillmentFeature
      eventId={eventId}
      roleId={roleId}
      shiftPlanId={planId ?? undefined}
    />
  );
};

/** F-7-1〜F-7-3: 評価サマリーバブル */
const ShiftPlanSummaryBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);

  const eventId = bubble.params.eventId ?? currentEventId;
  const planId = bubble.params.planId ?? currentShiftPlanId;

  if (!eventId || !planId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        イベントまたはシフト案が選択されていません
      </div>
    );
  }

  return <ShiftPlanSummary eventId={eventId} shiftPlanId={planId} />;
};

/** イベント一覧バブル */
const EventListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  return (
    <EventListFeature
      onEventSelect={(eventId) =>
        openBubble(`shift-puzzle/events/${eventId}`, bubble.id)
      }
    />
  );
};

/** イベント詳細バブル */
const EventDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const currentEventId = useAppSelector(selectCurrentEventId);
  const eventId = bubble.params.eventId ?? currentEventId;

  if (!eventId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        イベントが指定されていません
      </div>
    );
  }

  return (
    <EventDetailFeature
      eventId={eventId}
      onOpenMembers={() => openBubble(`shift-puzzle/events/${eventId}/members`, bubble.id)}
      onOpenRoles={() => openBubble(`shift-puzzle/events/${eventId}/roles`, bubble.id)}
      onOpenShiftPlans={() => openBubble(`shift-puzzle/events/${eventId}/shift-plans`, bubble.id)}
    />
  );
};

/** 役割一覧バブル */
const RoleListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);
  const eventId = bubble.params.eventId ?? currentEventId;

  if (!eventId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        イベントが指定されていません
      </div>
    );
  }

  return (
    <RoleListFeature
      eventId={eventId}
      onRoleSelect={(roleId) => {
        const planId = currentShiftPlanId;
        const url = planId
          ? `shift-puzzle/events/${eventId}/shift-plans/${planId}/role/${roleId}`
          : `shift-puzzle/events/${eventId}/roles/${roleId}`;
        openBubble(url, bubble.id);
      }}
    />
  );
};

/** F-6-1〜F-6-3: シフト案管理バブル（Issue #41） */
const ShiftPlanListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const currentEventId = useAppSelector(selectCurrentEventId);
  const eventId = bubble.params.eventId ?? currentEventId;

  if (!eventId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        イベントが指定されていません
      </div>
    );
  }

  return (
    <ShiftPlanManager
      eventId={eventId}
      onPlanSelect={(planId) =>
        openBubble(`shift-puzzle/events/${eventId}/shift-plans/${planId}`, bubble.id)
      }
    />
  );
};

/** シフト案詳細（ガントチャート）バブル */
const ShiftPlanDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const dispatch = useAppDispatch();
  const currentEventId = useAppSelector(selectCurrentEventId);
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);

  const eventId = bubble.params.eventId ?? currentEventId;
  const planId = bubble.params.planId ?? currentShiftPlanId;

  if (!eventId || !planId) {
    return (
      <div style={{ padding: 24, color: "#888", textAlign: "center" }}>
        シフト案が指定されていません
      </div>
    );
  }

  const handleOpenSummary = () =>
    openBubble(`shift-puzzle/events/${eventId}/shift-plans/${planId}/summary`, bubble.id);

  /**
   * セルクリック → バブルを開く（gakkai-shift スタイルのダイナミックレイアウト）
   * 役割ビュー: メンバー一覧を開く（時間帯でフィルター済み）
   * メンバービュー: 役割一覧を開く
   */
  const handleCellClick = (rowId: string, timeSlotId: string, mode: "role" | "member") => {
    if (mode === "role") {
      // 役割行クリック: その時間帯に参加可能なメンバー一覧をバブルで表示
      dispatch(setMemberFilter({ availableAtSlotId: timeSlotId }));
      openBubble(`shift-puzzle/events/${eventId}/members`, bubble.id, "bubble-side");
    } else {
      // メンバー行クリック: 役割一覧をバブルで表示
      openBubble(`shift-puzzle/events/${eventId}/roles`, bubble.id, "bubble-side");
    }
  };

  /**
   * 配置ブロッククリック → メンバー詳細バブルを開く
   */
  const handleAssignmentClick = (_assignmentId: string, memberId: string, _roleId: string) => {
    openBubble(
      `shift-puzzle/events/${eventId}/shift-plans/${planId}/member/${memberId}`,
      bubble.id,
      "bubble-side"
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "6px 12px", background: "#f5f5f5", borderBottom: "1px solid #e0e0e0", display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleOpenSummary}
          style={{ padding: "4px 12px", background: "#1976d2", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.82em", fontWeight: 600 }}
        >
          評価サマリー
        </button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ShiftPlanGanttEditor
          shiftPlanId={planId}
          eventId={eventId}
          onCellClick={handleCellClick}
          onAssignmentClick={handleAssignmentClick}
        />
      </div>
    </div>
  );
};

export const shiftPuzzleBubbleRoutes: BubbleRoute[] = [
  // Issue #39: Phase 1 全バブルルート
  {
    pattern: "shift-puzzle/events",
    type: "shift-puzzle-events",
    Component: EventListBubble,
  },
  {
    pattern: "shift-puzzle/events/:eventId",
    type: "shift-puzzle-event-detail",
    Component: EventDetailBubble,
  },
  {
    pattern: "shift-puzzle/events/:eventId/roles",
    type: "shift-puzzle-roles",
    Component: RoleListBubble,
  },
  {
    pattern: "shift-puzzle/events/:eventId/shift-plans",
    type: "shift-puzzle-shift-plans",
    Component: ShiftPlanListBubble,
  },
  {
    pattern: "shift-puzzle/events/:eventId/shift-plans/:planId",
    type: "shift-puzzle-shift-plan-detail",
    Component: ShiftPlanDetailBubble,
  },
  {
    // 旧: デモ用エントリーポイント（後方互換のため残す）
    pattern: "shift-puzzle/editor",
    type: "shift-puzzle-editor",
    Component: ShiftPuzzleEditorBubble,
  },
  {
    // F-3-3: 配置理由一覧
    pattern: "shift-puzzle/events/:eventId/shift-plans/:planId/reasons",
    type: "shift-puzzle-reasons",
    Component: ReasonListBubble,
  },
  {
    pattern: "shift-puzzle/reasons",
    type: "shift-puzzle-reasons",
    Component: ReasonListBubble,
  },
  {
    // F-4-1: メンバー詳細（シフト案レベル）
    pattern: "shift-puzzle/events/:eventId/shift-plans/:planId/member/:memberId",
    type: "shift-puzzle-member-detail",
    Component: MemberDetailBubble,
  },
  {
    // F-4-1: メンバー詳細（イベントレベル）
    pattern: "shift-puzzle/events/:eventId/members/:memberId",
    type: "shift-puzzle-member-detail",
    Component: MemberDetailBubble,
  },
  {
    // F-4-2: 役割充足詳細（シフト案レベル）
    pattern: "shift-puzzle/events/:eventId/shift-plans/:planId/role/:roleId",
    type: "shift-puzzle-role-fulfillment",
    Component: RoleFulfillmentBubble,
  },
  {
    // F-4-2: 役割詳細（イベントレベル）
    pattern: "shift-puzzle/events/:eventId/roles/:roleId",
    type: "shift-puzzle-role-detail",
    Component: RoleDetailBubble,
  },
  {
    // F-7-1〜F-7-3: 評価サマリー
    pattern: "shift-puzzle/events/:eventId/shift-plans/:planId/summary",
    type: "shift-puzzle-summary",
    Component: ShiftPlanSummaryBubble,
  },
  {
    // F-1-1〜F-1-4: メンバー一覧
    pattern: "shift-puzzle/events/:eventId/members",
    type: "shift-puzzle-members",
    Component: MemberListBubble,
  },
  {
    pattern: "shift-puzzle/members",
    type: "shift-puzzle-members",
    Component: MemberListBubble,
  },
];
