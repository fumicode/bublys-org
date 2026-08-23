'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { UrledPlace, getDragType, extractIdFromUrl } from "@bublys-org/bubbles-ui";
import {
  Staff,
  WorkShiftSet,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  DailyReservationInfo,
  StaffMonthlyShiftWish,
  ScheduleConstraints,
  ScheduleReport,
  fulfillWishesStep,
  makeSatisfyLeaderRulesStep,
  makeResolveAmbiguousLeaderSlotsStep,
  makeMinDayOffStep,
  WorkingDay,
  shiftCellKey,
  AUTO_SHIFT_STEPS,
  type AutoShiftStep,
  type ScheduleRepair,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import {
  ScheduleConstraintsBar,
  shiftColorById,
} from "../ui/ScheduleConstraintsBar.js";
import { ShiftCommandsBar } from "../ui/ShiftCommandsBar.js";
import { LinkedReportsView } from "../ui/LinkedReportsView.js";
import { DeadCellDiagnosisView } from "../ui/DeadCellDiagnosisView.js";
import { useObjects, useObject, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { commitCandidates, localScopeId } from "../objects/commit.js";
import { runAutoShiftStep } from "./autoShift.js";
import { suggestNextUndecided } from "./shiftSuggestion/index.js";
import {
  useScheduleCandidates,
  orderForcedCells,
  nextForcedCellAfter,
} from "./candidates/index.js";
import { buildScheduleConstraints, DAY_OFF_CANDIDATE_COUNT } from "./scheduleConstraints.js";
import { prioritizeStaffByLinkedReports } from "./reportPriority.js";
import { buildScheduleReport } from "./buildScheduleReport.js";
import { useScheduleHistory } from "./useScheduleHistory.js";
import {
  recordSetCell,
  recordAutoStep,
  recordRequiredEdit,
  recordConstraintEdit,
  buildCandidateEditLog,
} from "./recordScheduleEdit.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_RESERVATION_INFO_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  SCHEDULE_REPORT_TYPE,
  SCHEDULE_EDIT_LOG_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

type ScheduleGridProps = {
  scheduleId?: string;
  /** 世界線ビュー（左下）を開くハンドラ */
  onOpenHistory?: () => void;
  /** キセキの木ビュー（読み取り専用の木ビジュアル）を開くハンドラ */
  onOpenTree?: () => void;
  /** 可能勤務帯エディタ（左・スタッフ関連）を開くハンドラ */
  onOpenAvailability?: () => void;
  /** 完成レポート確定後に呼ばれる（レポートバブルを開くのは app 層の関心事） */
  onConfirm?: (reportId: string) => void;
  /**
   * 各アクションバブルの URL（data-url アンカー用）。ボタンを UrledPlace で包むと、
   * そのボタンから link bubble が伸びる。openBubble する URL と一致させる。
   * URL スキームは app 層の関心事なので注入で受ける。
   */
  worldLineUrl?: string;
  treeUrl?: string;
  availabilityUrl?: string;
  /** 操作履歴（ノウハウ）バブルの URL */
  editLogUrl?: string;
  /** 操作履歴バブルを開くハンドラ */
  onOpenEditLog?: () => void;
  /**
   * 稼働日詳細バブルの URL を作る（稼働日キーを渡す）。URL スキームは app 層の関心事なので
   * バブルルート側から注入してもらう。グリッドはこれを ObjectView に渡すだけ。
   */
  dayBubbleUrl?: (dayKey: string) => string;
  /** 違反バブルの URL を作る（違反 key を渡す）。同上・app 層から注入。 */
  violationBubbleUrl?: (violationKey: string) => string;
  /**
   * 予約状況（宿泊人数・部屋数）編集バブルの URL。渡すと日付ヘッダの上に予約行を出し、
   * ダブルクリックでこの URL のバブルを開く。URL スキームは app 層の関心事なので注入で受ける。
   */
  reservationInfoUrl?: string;
  /** ルール可視化バブルの URL を作る（ロールキー）。上部ルール行の ObjectView に渡す */
  ruleBubbleUrl?: (ruleKey: string) => string;
  /**
   * シフト完成レポートバブルの URL を作る（レポート ID）。同上・app 層から注入。
   * レポート ID は scheduleId と現在の apex ノード ID から決まる（ScheduleReport.idOf）ため、
   * 確定前でも「今クリックしたら作られるレポート」の URL を先読みして「完成レポートを
   * 作成」ボタンに付けられる（そのボタン自身が schedule-report の bubble link 起点になる）。
   */
  reportBubbleUrl?: (reportId: string) => string;
  /**
   * 責任者ルールを追加したあと、その編集バブルを開くハンドラ（ロールキーを渡す）。
   * 渡すと「＋ 責任者ルールを追加」が有効になる。URL/開き方は app 層の関心事なので注入で受ける。
   */
  onOpenRule?: (ruleKey: string) => void;
  /**
   * 候補集合を計算する worker を作る。worker の作り方は bundler 依存なので app 層から
   * 注入する（URL スキームと同じ流儀）。渡さなければ main thread で同期計算する。
   */
  createCandidatesWorker?: () => Worker;
};

/** 新しい責任者ルールの一意キーを生成する。 */
const newLeaderRuleKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `leader-${Date.now()}`;

/**
 * 勤務表グリッド。セル編集・自動ステップ等は recordScheduleEdit 経由で
 * Schedule + EditLog を同一世界線ノードに記録する。
 */
export const ScheduleGrid: FC<ScheduleGridProps> = ({
  scheduleId,
  onOpenHistory,
  onOpenTree,
  onOpenAvailability,
  onOpenEditLog,
  onConfirm,
  worldLineUrl,
  treeUrl,
  availabilityUrl,
  editLogUrl,
  dayBubbleUrl,
  violationBubbleUrl,
  ruleBubbleUrl,
  reportBubbleUrl,
  reservationInfoUrl,
  onOpenRule,
  createCandidatesWorker,
}) => {
  useSeedHotelData();
  const store = useAppStore();
  const { scope } = useScheduleHistory(scheduleId ?? "");
  const apex = scope.graph.getApex();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [cellSelection, setCellSelection] = useState<{
    staffId: string;
    day: WorkingDay;
  } | null>(null);
  const staffList = useObjects<Staff>(STAFF_TYPE);
  // 候補集合は勤務表の全行について計算する（表示のフィルタとは無関係）
  const staffIds = useMemo(() => staffList.map((s) => s.id), [staffList]);
  // この勤務表の勤務帯セット（id=scheduleId）。開始時刻昇順の勤務帯を得る。
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);
  const availability = useObject<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  // 稼働日ごとの予約状況（宿泊人数・部屋数）。未作成なら undefined（予約行は空表示）。
  const reservationInfo = useObject<DailyReservationInfo>(
    SCHEDULE_RESERVATION_INFO_TYPE,
    scheduleId
  );
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);

  // ----- 部署フィルタ / グルーピング状態 -----
  const [groupByDept, setGroupByDept] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>(""); // "" = 全部署

  // ----- 抽出のためのスタッフ選択状態 -----
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const toggleStaffSelected = (staffId: string) =>
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  // 選択中スタッフID（勤務表の並び順を保つ。URL/抽出の引数を安定させる）
  const selectedIds = useMemo(
    () => staffList.filter((s) => selectedStaffIds.has(s.id)).map((s) => s.id),
    [staffList, selectedStaffIds]
  );

  // 重複なしの部署一覧（未設定を除く）
  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const s of staffList) {
      if (s.department) set.add(s.department);
    }
    return Array.from(set).sort();
  }, [staffList]);

  // フィルタ適用後のスタッフ一覧
  const filteredStaffList = useMemo(() => {
    if (!deptFilter) return staffList;
    return staffList.filter((s) => s.department === deptFilter);
  }, [staffList, deptFilter]);

  // 責任者ルール（早責/夜責）は勤務表ごとの制約オブジェクトから読む（世界線に載る）。
  const constraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );
  const leaderRules = useMemo(() => constraints?.leaderRules ?? [], [constraints]);

  // 参考として紐づけたシフト完成レポート（次回シフト作成のルール・配慮として使う）。
  // ドロップで紐づけ、自動シフトの実行前に staffList をこれで優先度づけする。
  const allReports = useObjects<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const reportRepo = useObjectRepo<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const linkedReports = useMemo(() => {
    const ids = constraints?.linkedReportIds ?? [];
    return allReports.filter((r) => ids.includes(r.id));
  }, [allReports, constraints]);

  // 休みの制約値は集約から（世界線に載る）。未投入時は既定にフォールバック。
  const minDayOff = constraints?.minMonthlyDayOff ?? 8;
  const maxPerDay = constraints?.maxDayOffPerDay ?? 8;

  // 責任者バッジのクリック: そのルールの担当者を選択に足す（全員入っていれば外す＝トグル）。
  const selectRuleStaff = (ids: string[]) =>
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      const allIn = ids.length > 0 && ids.every((id) => next.has(id));
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });

  // 自動シフトの操作対象（subset）: 選択があればその人たち、無ければ全員。並び順は勤務表順を保つ。
  const subsetStaff = useMemo(
    () =>
      selectedStaffIds.size > 0
        ? staffList.filter((s) => selectedStaffIds.has(s.id))
        : staffList,
    [staffList, selectedStaffIds]
  );

  // 操作対象に関係する責任者ルール（メンバー全員が subset に含まれるものだけ）。
  // 選択が空＝全員のときは、担当者のいるルールすべてが対象になる。＝解決案生成が解く制約。
  const relevantRules = useMemo(() => {
    const idSet = new Set(subsetStaff.map((s) => s.id));
    return leaderRules.filter(
      (r) => r.leaderStaffIds.length > 0 && r.leaderStaffIds.every((id) => idSet.has(id))
    );
  }, [leaderRules, subsetStaff]);

  // 解決案ボタンのラベルには「いま解こうとしている制約の名前」を入れる（例:「早責」解決案生成）。
  // 何案つくるか・世界線に書くことは説明（tooltip）に回し、ボタンは目的だけを短く言う。
  const candidateLabel = useMemo(() => {
    const names = relevantRules.map((r) => r.label);
    return names.length > 0 ? `「${names.join("・")}」解決案生成` : "解決案生成";
  }, [relevantRules]);

  // 責任者ルールを人が読める形で描く用。名前は絞り込み前の全スタッフから引く
  // （部署フィルタで責任者が消えても名前を解決できるように）。
  const nameOf = useMemo(() => {
    const map = new Map(staffList.map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? id;
  }, [staffList]);

  // この勤務表と同じ年月のシフト希望を staffId 別に引けるようにする
  const wishByStaff = useMemo(() => {
    const map = new Map<string, StaffMonthlyShiftWish>();
    if (schedule) {
      for (const w of allWishes) {
        if (w.year === schedule.year && w.month === schedule.month) {
          map.set(w.staffId, w);
        }
      }
    }
    return map;
  }, [allWishes, schedule]);

  // 制約チェックは変更のたびに再計算する（割当・希望が変わるたび）。
  // 連勤・希望に加え、責任者ルールの未充足（担当勤務帯に minCount 未満の日）も同じ違反
  // パイプラインで拾う。責任者違反は「日単位（staffId なし）」で、列の警告として表に出る。
  // この勤務表に効く「すべての制約」を宣言的オブジェクトとして1本に組み立てる。
  // 表示（上部ルール）も違反も、この同じ制約リストから導出する（手書き文字列なし）。
  // ※ handleDropReportUrl / handleAddRule より前に定義する（use-before-define 回避）。
  const allConstraints = useMemo(() => {
    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    return buildScheduleConstraints({
      modelConstraints: constraints?.modelConstraints(shiftIdsOf),
      wish: (constraints?.checkShiftWish ?? true) ? { wishByStaff, shiftNameById } : undefined,
    });
  }, [workShifts, constraints, wishByStaff]);

  const handleDropReportUrl = (url: string) => {
    const reportId = extractIdFromUrl(url);
    if (!reportId || !scheduleId) return;
    const base = constraints ?? new ScheduleConstraints({ scheduleId, leaderRules: [] });
    if (base.linkedReportIds.includes(reportId)) return; // 既に紐づいていれば何もしない
    const next = base.linkReport(reportId);
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    recordConstraintEdit(store, {
      schedule,
      beforeConstraints: allConstraints,
      afterConstraints: buildScheduleConstraints({
        modelConstraints: next.modelConstraints(shiftIdsOf),
        wish: next.checkShiftWish ? { wishByStaff, shiftNameById } : undefined,
      }),
      nextConstraints: next,
      summary: `レポートを紐づけ: ${reportId}`,
    });
  };
  const handleUnlinkReport = (reportId: string) => {
    if (!constraints) return;
    const next = constraints.unlinkReport(reportId);
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    recordConstraintEdit(store, {
      schedule,
      beforeConstraints: allConstraints,
      afterConstraints: buildScheduleConstraints({
        modelConstraints: next.modelConstraints(shiftIdsOf),
        wish: next.checkShiftWish ? { wishByStaff, shiftNameById } : undefined,
      }),
      nextConstraints: next,
      summary: `レポートの紐づけを解除: ${reportId}`,
    });
  };

  // 責任者ルールを後から追加する。新しいルール（担当勤務帯は先頭の勤務帯・候補者は空）を
  // 制約集約に足して保存し、その場で編集バブルを開く。人の集合と時間帯はそこで編集する。
  const handleAddRule = () => {
    if (!scheduleId) return;
    const key = newLeaderRuleKey();
    const base =
      constraints ?? new ScheduleConstraints({ scheduleId, leaderRules: [] });
    const next = base.addRule({
      key,
      label: "新責任者",
      shiftName: workShifts[0]?.name ?? "",
      leaderStaffIds: [],
      minCount: 1,
    });
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    recordConstraintEdit(store, {
      schedule,
      beforeConstraints: allConstraints,
      afterConstraints: buildScheduleConstraints({
        modelConstraints: next.modelConstraints(shiftIdsOf),
        wish: next.checkShiftWish ? { wishByStaff, shiftNameById } : undefined,
      }),
      nextConstraints: next,
      summary: `責任者ルールを追加: ${key}`,
    });
    onOpenRule?.(key);
  };

  const violations = useMemo(
    () => (schedule ? schedule.checkConstraints(allConstraints) : []),
    [schedule, allConstraints]
  );

  // まだ決まっていないセルに入れられる値（候補集合）。確定のたびに影響範囲だけ計算し直す。
  const { candidates, computing, diagnoseDeadCell, diagnosis, diagnosing } =
    useScheduleCandidates({
    schedule,
    constraints,
    checkShiftWish: constraints?.checkShiftWish ?? true,
    wishByStaff,
    workShifts,
    staffIds,
    createWorker: createCandidatesWorker,
  });

  /** セルの値 → 人が読むラベル（"早番" / "休み"） */
  const cellLabelOf = useCallback(
    (cell: ShiftCell) =>
      cell.kind === "work"
        ? (workShifts.find((w) => w.id === cell.shiftId)?.name ?? cell.shiftId)
        : cell.kind === "day-off"
          ? "休み"
          : "未定",
    [workShifts]
  );

  const candidateHintOf = useCallback(
    (staffId: string, day: WorkingDay): string | undefined => {
      const options = candidates.candidatesOf(staffId, day);
      if (!options) return undefined; // 確定済み（候補集合は未定セルの分だけ持つ）
      if (options.length === 0) return "候補なし（このままではこのセルを埋められません）";
      const labelOf = cellLabelOf;
      const values = options.map(labelOf).join(" / ");
      return options.length === 1
        ? `候補は${values}だけ（ここは一意に決まります）`
        : `候補${options.length}件: ${values}`;
    },
    [candidates, cellLabelOf]
  );

  // 候補が1つに絞られたセル＝制約から一意に決まる手。承認するまで勤務表には入れない。
  // 再計算中は前回の（古いかもしれない）提案を出さない。承認直後に古い値を書かないため。
  const orderedForcedCells = useMemo(
    () => (computing ? [] : orderForcedCells(candidates.forcedCells(), staffIds)),
    [candidates, computing, staffIds]
  );

  const forcedCellOf = useMemo(() => {
    const byCell = new Map(
      orderedForcedCells.map((forced) => [
        `${forced.staffId}:${forced.day.key}`,
        forced.cell,
      ])
    );
    return (staffId: string, day: WorkingDay) => byCell.get(`${staffId}:${day.key}`);
  }, [orderedForcedCells]);

  // 候補が0件のセル＝もうどの値も入れられない（詰み）。確定提案と同じく、再計算中は
  // 前回の（古いかもしれない）判定で赤くしない。
  const deadCells = useMemo(
    () => (computing ? [] : candidates.deadCells()),
    [candidates, computing]
  );

  const isDeadCell = useMemo(() => {
    const keys = new Set(deadCells.map((cell) => `${cell.staffId}:${cell.day.key}`));
    return (staffId: string, day: WorkingDay) => keys.has(`${staffId}:${day.key}`);
  }, [deadCells]);

  useEffect(() => {
    if (!schedule || cellSelection) return;
    const next = suggestNextUndecided(
      schedule,
      staffList.map((s) => s.id)
    );
    if (next) {
      setCellSelection({ staffId: next.staffId, day: next.day });
    }
  }, [schedule, cellSelection, staffList]);

  const advanceFocusAfterEdit = useCallback(
    (nextSchedule: MonthlyStaffSchedule) => {
      const next = suggestNextUndecided(
        nextSchedule,
        staffList.map((s) => s.id)
      );
      setCellSelection(
        next ? { staffId: next.staffId, day: next.day } : null
      );
    },
    [staffList]
  );

  // 責任者アイコンの流れを「担当勤務帯の色」で塗るための解決関数（勤務帯名 → id → 色）。
  const shiftColorOf = useMemo(() => {
    const idByName = new Map<string, string>();
    for (const w of workShifts) if (!idByName.has(w.name)) idByName.set(w.name, w.id);
    return (shiftName: string) => shiftColorById(idByName.get(shiftName));
  }, [workShifts]);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  // セル編集: EditLog 付きで同一世界線ノードに記録
  const handleChangeCell = (staffId: string, day: WorkingDay, to: ShiftCell) => {
    const next = recordSetCell(store, {
      schedule,
      constraints: allConstraints,
      staffId,
      staffName: nameOf(staffId),
      day,
      to,
    });
    setCellSelection({ staffId, day });
    advanceFocusAfterEdit(next);
  };

  // 確定提案の承認（Tab）。人が承認した手として EditLog に残し（source: "suggestion"）、
  // 次の提案セルへフォーカスを送る。押し続けるだけで提案を順に潰していけるようにする。
  const handleApproveForced = (
    staffId: string,
    day: WorkingDay,
    cell: ShiftCell
  ) => {
    const next = nextForcedCellAfter(orderedForcedCells, {
      staffId,
      dayKey: day.key,
    });
    const nextSchedule = recordSetCell(store, {
      schedule,
      constraints: allConstraints,
      staffId,
      staffName: nameOf(staffId),
      day,
      to: cell,
      suggestionId: `forced:${staffId}:${day.key}:${shiftCellKey(cell)}`,
    });
    if (next) {
      setCellSelection({ staffId: next.staffId, day: next.day });
      return;
    }
    advanceFocusAfterEdit(nextSchedule);
  };

  // 詰みの解消案を勤務表に書き込む。人が選んで押した手なので、通常のセル編集と同じ扱いで
  // EditLog に残す（どういう理由でその日を動かしたかは、詰みの記録として世界線に残る）。
  const handleApplyRepair = (repair: ScheduleRepair) => {
    handleChangeCell(repair.staffId, repair.day, repair.to);
  };

  // 自動シフト：操作対象（subset＝選択 or 全員）だけを staffList として渡す → ステップが subset 限定になる。
  // 紐づけたレポートで譲歩が多かった人を先に処理する（休みの取得優先権に効く。詳しくは reportPriority.ts）。
  const handleRunStep = (step: AutoShiftStep) => {
    const result = runAutoShiftStep(step, {
      schedule,
      staffList: prioritizeStaffByLinkedReports(subsetStaff, linkedReports),
      workShifts,
      wishByStaff,
      availability,
      // 「必要人数を埋める」はこれを見て、先に各自の休み（月◯日／1日◯人まで）を確保してから埋める
      minDayOff,
      maxDayOffPerDay: maxPerDay,
      maxConsecutive: constraints?.maxConsecutiveWorkdays,
    });
    recordAutoStep(store, {
      schedule,
      next: result.schedule,
      constraints: allConstraints,
      stepId: step.key,
      stepLabel: step.label,
      message: result.message,
    });
    setAutoMessage(`${step.label}: ${result.message}`);
  };

  // 完成案の複数生成：世界線比較ツール。生成後は世界線ビューへ誘導する。
  const handleGenerateCandidates = () => {
    if (!scheduleId) return;
    // 紐づけたレポートで譲歩が多かった人を先に処理する（handleRunStep と同じ優先度づけ）。
    const prioritizedStaff = prioritizeStaffByLinkedReports(subsetStaff, linkedReports);
    const runOn = (sched: MonthlyStaffSchedule, step: AutoShiftStep) =>
      runAutoShiftStep(step, {
        schedule: sched,
        staffList: prioritizedStaff,
        workShifts,
        wishByStaff,
        availability,
        // handleRunStep と同じく連勤上限を渡す。渡さないと ctx.maxConsecutive が undefined に
        // なってステップ側の既定値 5 で走り、連勤上限を 5 未満にしている勤務表では
        // 生成した案が全て連勤違反になってしまう。
        maxConsecutive: constraints?.maxConsecutiveWorkdays,
      }).schedule;
    const buildCandidate = (phase: number): MonthlyStaffSchedule => {
      let s = schedule;
      s = runOn(s, fulfillWishesStep);

      // ambiguousLeaderSlots が要るので runOn（.scheduleだけ取り出す）は使わず直接呼ぶ
      const leaderFill = runAutoShiftStep(
        makeSatisfyLeaderRulesStep(relevantRules, leaderRules),
        { schedule: s, staffList: prioritizedStaff, workShifts, wishByStaff, availability }
      );
      s = leaderFill.schedule;

      s = runOn(
        s,
        makeResolveAmbiguousLeaderSlotsStep(leaderFill.ambiguousLeaderSlots ?? [], { phase })
      );
      s = runOn(s, makeMinDayOffStep(minDayOff, { maxPerDay, phase }));
      return s;
    };
    const candidates = Array.from({ length: DAY_OFF_CANDIDATE_COUNT }, (_, i) => {
      const obj = buildCandidate(i);
      const label = `案${i + 1}`;
      return {
        obj,
        label,
        extras: [
          {
            type: SCHEDULE_EDIT_LOG_TYPE,
            obj: buildCandidateEditLog(store, {
              baseSchedule: schedule,
              candidate: obj,
              constraints: allConstraints,
              label,
            }),
          },
        ],
      };
    });
    commitCandidates(
      store,
      localScopeId(SCHEDULE_TYPE, scheduleId),
      SCHEDULE_TYPE,
      schedule,
      candidates
    );
    setAutoMessage(
      `世界線に比較用の完成案を${DAY_OFF_CANDIDATE_COUNT}つ置きました。世界線ビューで枝を切り替えて見比べてください。`
    );
    onOpenHistory?.();
  };

  // 必要スタッフ数の編集（その日・全日）。EditLog 付きで記録
  const handleChangeRequired = (day: WorkingDay, shiftName: string, count: number) => {
    recordRequiredEdit(store, {
      schedule,
      constraints: allConstraints,
      transform: (s) => s.setRequired(day, shiftName, count),
      summary: `${day.day}日 ${shiftName} の必要人数 → ${count}`,
      dayKey: day.key,
      shiftName,
    });
  };
  const handleChangeRequiredAllDays = (shiftName: string, count: number) => {
    recordRequiredEdit(store, {
      schedule,
      constraints: allConstraints,
      transform: (s) => s.setRequiredForAllDays(shiftName, count),
      summary: `全日 ${shiftName} の必要人数 → ${count}`,
      shiftName,
    });
  };

  // 「完成レポートを作成」: apex の勤務表状態からレポートを計算して保存し、
  // apex に確定ラベルを付ける（未命名なら既定ラベルを自動生成。既に名前が
  // 付いていれば尊重してそのまま残す）。レポートを開くのは app 層（onConfirm）の関心事。
  //
  // レポートは「確定時点のスナップショット」（ScheduleReport 参照）なので、同じ apex に対して
  // 既に作られていれば作り直さず、そのまま開く。このボタンは pendingReportUrl でレポートを
  // 開く導線も兼ねており、勤務表を編集せずに2回押すと ID（scheduleId + apex.id）が同じまま
  // create() し直してしまう。そうすると確定後も編集できる項目（タイトル・配慮メモ・
  // 譲歩/繁忙日の重み）が既定値へ巻き戻って消える。
  // 世界線のノードから状態を取り出すので resolveObjectsAt を使う（同期の getObjectAt だと
  // メモリから追い出されたぶんが黙って読めず、何も起きないボタンになる）。
  const handleConfirm = async () => {
    if (!scheduleId || !apex) return;

    const existing = allReports.find(
      (r) => r.id === ScheduleReport.idOf(scheduleId, apex.id)
    );
    if (existing) {
      onConfirm?.(existing.id);
      return;
    }

    const resolved = await scope.resolveObjectsAt(apex.id);
    const apexSchedule = resolved.find(
      (r) => r.type === SCHEDULE_TYPE && r.id === scheduleId
    )?.obj as MonthlyStaffSchedule | undefined;
    if (!apexSchedule) return;

    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    const wishByStaffForApex = new Map<string, StaffMonthlyShiftWish>();
    for (const w of allWishes) {
      if (w.year === apexSchedule.year && w.month === apexSchedule.month) {
        wishByStaffForApex.set(w.staffId, w);
      }
    }
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    const reportConstraints = buildScheduleConstraints({
      modelConstraints: constraints?.modelConstraints(shiftIdsOf),
      wish: (constraints?.checkShiftWish ?? true)
        ? { wishByStaff: wishByStaffForApex, shiftNameById }
        : undefined,
    });

    const draft = buildScheduleReport({
      schedule: apexSchedule,
      staffIds: staffList.map((s) => s.id),
      constraints: reportConstraints,
    });

    const report = ScheduleReport.create({
      scheduleId,
      worldLineNodeId: apex.id,
      year: apexSchedule.year,
      month: apexSchedule.month,
      storeId: apexSchedule.storeId,
      ...draft,
    });
    reportRepo.save(report);

    if (!apex.label) {
      scope.setNodeLabel(apex.id, `確定: ${apexSchedule.year}年${apexSchedule.month}月`);
    }

    onConfirm?.(report.id);
  };

  // アクションボタンを URL（data-url）で包む。url があると、その URL のバブルを開いたとき
  // link bubble がこのボタンから伸びる（openBubble する URL と一致している必要がある）。
  const withUrl = (url: string | undefined, node: ReactNode): ReactNode =>
    url ? <UrledPlace url={url}>{node}</UrledPlace> : node;

  // 「完成レポートを作成」ボタン。レポート ID は scheduleId + 現在の apex ノード ID で決まる
  // （ScheduleReport.idOf）ので、クリック前でも「今押したら作られるレポート」の URL を
  // 先読みしてボタンに付けられる。これにより schedule-report の bubble link はこのボタン
  // 自身から伸びる（キセキの木の link が「キセキの木で見る」ボタンから伸びるのと対称）。
  const pendingReportUrl =
    scheduleId && apex && reportBubbleUrl
      ? reportBubbleUrl(ScheduleReport.idOf(scheduleId, apex.id))
      : undefined;

  const confirmButton = withUrl(
    pendingReportUrl,
    <button
      type="button"
      className="e-confirm"
      onClick={() => void handleConfirm()}
      title="今表示している勤務表を確定し、譲歩・繁忙日対応・貢献度のレポートを作成します"
    >
      🏁 完成レポートを作成
    </button>
  );

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          {schedule.year}年{schedule.month}月の勤務表{" "}
          <span className="e-sub">{schedule.storeId}</span>
        </h3>

        {/* 左：スタッフ（左列）に関わる操作をまとめる */}
        <div className="e-actions e-actions-left">
          {/* 部署別グルーピングトグル */}
          <button
            type="button"
            className={`e-link${groupByDept ? " is-active" : ""}`}
            onClick={() => setGroupByDept((v) => !v)}
            title="部署別にグループ化して表示"
          >
            部署別
          </button>

          {/* 部署フィルタ（ドロップダウン） */}
          {departments.length > 0 && (
            <select
              className="e-dept-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              title="表示する部署を絞り込む"
            >
              <option value="">全部署</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {onOpenAvailability &&
            withUrl(
              availabilityUrl,
              <button type="button" className="e-link" onClick={onOpenAvailability}>
                可能勤務帯
              </button>
            )}

          {/* 参考として紐づけたシフト完成レポート（レポート一覧バブルからドラッグで紐づけ、
              自動シフトの優先度に使う。詳しくは reportPriority.ts）。
              独立した行にすると縦を食うので、可能勤務帯の右に並べて高さを抑える。 */}
          <LinkedReportsView
            reports={linkedReports}
            onDropUrl={handleDropReportUrl}
            dropAcceptTypes={[getDragType(SCHEDULE_REPORT_TYPE)]}
            onUnlink={handleUnlinkReport}
          />
        </div>
      </div>

      {/* 左: 適用中の制約を動的アイコンで描く（稼働日ごと↕ / 人ごと↔ / 全体）
          右: それを満たすためのシフトコマンド（制約を見ながら打てるように隣へ置く） */}
      <div className="e-rules-strip">
        <ScheduleConstraintsBar
          leaderRules={leaderRules}
          nameOf={nameOf}
          shiftColorOf={shiftColorOf}
          onSelectRule={selectRuleStaff}
          selectedStaffIds={selectedStaffIds}
          ruleBubbleUrl={ruleBubbleUrl}
          onAddRule={scheduleId && onOpenRule ? handleAddRule : undefined}
          maxConsecutive={constraints?.maxConsecutiveWorkdays ?? 5}
          minDayOff={minDayOff}
          maxPerDay={maxPerDay}
          checkShiftWish={constraints?.checkShiftWish ?? true}
        />
        <ShiftCommandsBar
          targetCount={subsetStaff.length}
          selectedCount={selectedIds.length}
          onClearSelection={
            selectedIds.length > 0 ? () => setSelectedStaffIds(new Set()) : undefined
          }
          steps={AUTO_SHIFT_STEPS}
          onRunStep={handleRunStep}
          onGenerateCandidates={handleGenerateCandidates}
          candidateLabel={candidateLabel}
          candidateTitle={`この ${subsetStaff.length} 名について「毎日 責任者が入る＋全員 月${minDayOff}日休む（1日${maxPerDay}人まで）」完成案を ${DAY_OFF_CANDIDATE_COUNT} つくり、それぞれ別の世界線に書いて見比べます。`}
          message={autoMessage}
          onCloseMessage={() => setAutoMessage(null)}
        />
      </div>

      {/* グリッド領域 */}
      <div className="e-grid-area">
        <ScheduleGridView
          schedule={schedule}
          staffList={filteredStaffList}
          workShifts={workShifts}
          availability={availability}
          reservationInfo={reservationInfo}
          reservationInfoUrl={reservationInfoUrl}
          wishByStaff={wishByStaff}
          violations={violations}
          groupByDepartment={groupByDept}
          leaderRules={leaderRules}
          selectedStaffIds={selectedStaffIds}
          onToggleStaffSelected={toggleStaffSelected}
          onSelectRule={selectRuleStaff}
          minDayOff={constraints?.minMonthlyDayOff}
          maxDayOffPerDay={constraints?.maxDayOffPerDay}
          onChangeCell={handleChangeCell}
          onChangeRequired={handleChangeRequired}
          onChangeRequiredAllDays={handleChangeRequiredAllDays}
          dayBubbleUrl={dayBubbleUrl ? (day) => dayBubbleUrl(day.key) : undefined}
          violationUrl={
            violationBubbleUrl ? (v) => violationBubbleUrl(v.key) : undefined
          }
          selection={cellSelection}
          onSelectionChange={setCellSelection}
          candidateHintOf={candidateHintOf}
          forcedCellOf={forcedCellOf}
          isDeadCell={isDeadCell}
          onApproveForced={handleApproveForced}
        />
      </div>

      {/* 詰みの通知。セル1つの赤ハッチだけでは月末に埋もれるので、盤面の総数をここで出し、
          最初の詰みセルへ飛べるようにする。 */}
      {deadCells.length > 0 && (
        <div className="e-dead-notice">
          <span>
            埋められないセルが {deadCells.length} 件あります（どの値を入れても制約に反します）
          </span>
          <button
            type="button"
            className="e-dead-jump"
            onClick={() =>
              setCellSelection({
                staffId: deadCells[0].staffId,
                day: deadCells[0].day,
              })
            }
          >
            最初のセルへ
          </button>
          <button
            type="button"
            className="e-dead-jump"
            disabled={diagnosing}
            title="どこを書き換えればこのセルが埋まるかを、盤面を総当たりして探します（少し時間がかかります）"
            onClick={() =>
              diagnoseDeadCell({
                staffId: deadCells[0].staffId,
                dayKey: deadCells[0].day.key,
              })
            }
          >
            {diagnosing ? "探しています…" : "解消案を探す"}
          </button>
        </div>
      )}

      {diagnosis && (
        <div className="e-dead-diagnosis">
          <DeadCellDiagnosisView
            diagnosis={diagnosis}
            nameOf={nameOf}
            labelOf={cellLabelOf}
            onApply={handleApplyRepair}
          />
        </div>
      )}

      {/* 左下：世界線ビュー。ボタンから link bubble が伸びる（bubble-side で開く） */}
      {(onOpenHistory || onOpenEditLog) && (
        <div className="e-footer">
          {onOpenHistory &&
            withUrl(
              worldLineUrl,
              <button
                type="button"
                className="e-link e-worldline"
                onClick={onOpenHistory}
                title="この勤務表の世界線ビューを開く"
              >
                🌐 世界線ビュー
              </button>
            )}
          {onOpenEditLog &&
            withUrl(
              editLogUrl,
              <button
                type="button"
                className="e-link"
                onClick={onOpenEditLog}
                title="操作履歴（ノウハウ）を開く"
              >
                📝 操作履歴
              </button>
            )}
          {onOpenTree &&
            withUrl(
              treeUrl,
              <button type="button" className="e-link" onClick={onOpenTree}>
                🌳 キセキの木で見る
              </button>
            )}
          {confirmButton}
        </div>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap; /* 参照レポートが増えても溢れず折り返す */
    gap: 12px;
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    /* 可能勤務帯などの操作＋参照レポートのドロップ欄を1行に収めて縦を抑える */
    .e-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }
    .e-dept-select {
      border: 1px solid #cfd8dc;
      border-radius: 6px;
      background: #fff;
      color: #37474f;
      font-size: 0.8em;
      padding: 4px 8px;
      cursor: pointer;
      outline: none;

      &:hover {
        border-color: #90a4ae;
      }
      &:focus {
        border-color: #3949ab;
      }
    }
  }

  /* 適用ルールの帯（左）＋ シフトコマンド（右）。横に並べて、制約を見ながら操作できるようにする */
  .e-rules-strip {
    display: flex;
    align-items: stretch;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  /* グリッド領域。抽出フロートの absolute 基準 */
  .e-grid-area {
    position: relative;
  }

  /* 自動シフト操作バー（グリッド下）。対象＝選択スタッフ（無ければ全員）に対して実行する */
  .e-auto-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;

    .e-auto-target {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8em;
      color: #455a64;
      margin-right: 2px;
    }
    .e-auto-clear {
      border: 1px solid #cfd8dc;
      border-radius: 999px;
      background: #fff;
      color: #607d8b;
      font-size: 0.85em;
      line-height: 1;
      padding: 2px 8px;
      cursor: pointer;
      &:hover {
        background: #eceff1;
        border-color: #90a4ae;
      }
    }

    .e-auto {
      border: 1px solid #b39ddb;
      border-radius: 6px;
      background: #fff;
      color: #5e35b1;
      font-size: 0.8em;
      font-weight: 600;
      padding: 4px 10px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover {
        background: #ede7f6;
        border-color: #9575cd;
      }
    }

    /* 複数案（世界線）生成ボタン */
    .e-candidate-run {
      border: 1px solid #a5d6a7;
      border-radius: 6px;
      background: #e8f5e9;
      color: #2e7d32;
      font-size: 0.8em;
      font-weight: 600;
      padding: 4px 10px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover {
        background: #c8e6c9;
        border-color: #66bb6a;
      }
    }
  }

  .e-dead-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 6px 10px;
    background: #fdecea;
    border: 1px solid #f5c6c2;
    border-radius: 6px;
    color: #b71c1c;
    font-size: 0.82em;

    .e-dead-jump {
      border: 1px solid #ef9a9a;
      border-radius: 4px;
      background: #fff;
      color: #b71c1c;
      font-size: 0.95em;
      line-height: 1.6;
      cursor: pointer;
      padding: 0 8px;

      &:hover {
        background: #ffebee;
      }

      &:disabled {
        opacity: 0.6;
        cursor: default;
      }

      &:first-of-type {
        margin-left: auto;
      }
    }
  }

  .e-dead-diagnosis {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid #f5c6c2;
    border-radius: 6px;
    background: #fffaf9;
  }


  /* 左下：世界線ビュー・キセキの木・完成レポート */
  .e-footer {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 完成レポートを作成(勤務表を確定してレポート＋キセキの木を開く) */
  .e-confirm {
    border: 1px solid #2e7d32;
    border-radius: 6px;
    background: #fff;
    color: #2e7d32;
    font-size: 0.8em;
    font-weight: 600;
    padding: 4px 10px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;

    &:hover {
      background: #e8f5e9;
      border-color: #388e3c;
    }
  }

  /* ヘッダ・フッタ共通のリンク風ボタン */
  .e-link {
    border: 1px solid #cfd8dc;
    border-radius: 6px;
    background: #fff;
    color: #37474f;
    font-size: 0.8em;
    padding: 4px 10px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;

    &:hover {
      background: #eceff1;
      border-color: #90a4ae;
    }

    &.is-active {
      background: #e8eaf6;
      border-color: #3949ab;
      color: #3949ab;
      font-weight: bold;
    }
  }
`;
