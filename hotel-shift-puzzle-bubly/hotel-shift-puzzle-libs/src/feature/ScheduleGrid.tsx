'use client';

import { FC, ReactNode, useMemo, useState } from "react";
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
  makePartnerCoverStep,
  makeSatisfyLeaderRulesStep,
  makeMinDayOffStep,
  type AutoShiftStep,
  type WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import {
  ScheduleConstraintsBar,
  shiftColorById,
} from "../ui/ScheduleConstraintsBar.js";
import { LinkedReportsView } from "../ui/LinkedReportsView.js";
import { useObjects, useObject, useObjectShell, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { commitCandidates, localScopeId } from "../objects/commit.js";
import { runAutoShiftStep } from "./autoShift.js";
import { buildScheduleConstraints, DAY_OFF_CANDIDATE_COUNT } from "./scheduleConstraints.js";
import { prioritizeStaffByLinkedReports } from "./reportPriority.js";
import { buildScheduleReport } from "./buildScheduleReport.js";
import { useScheduleHistory } from "./useScheduleHistory.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_RESERVATION_INFO_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  SCHEDULE_REPORT_TYPE,
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
  /** 自動シフトパネル（右上）を開くハンドラ */
  onOpenAutoShift?: () => void;
  /**
   * 各アクションバブルの URL（data-url アンカー用）。ボタンを UrledPlace で包むと、
   * そのボタンから link bubble が伸びる。openBubble する URL と一致させる。
   * URL スキームは app 層の関心事なので注入で受ける。
   */
  worldLineUrl?: string;
  treeUrl?: string;
  availabilityUrl?: string;
  autoShiftUrl?: string;
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
};

/** 新しい責任者ルールの一意キーを生成する。 */
const newLeaderRuleKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `leader-${Date.now()}`;

/**
 * 勤務表グリッド。編集はシェル経由：update(s => s.setCell(...)) を呼ぶだけで、
 * その勤務表を監視している世界線すべて（アプリ全体＋ローカル）へ自動保存される。
 */
export const ScheduleGrid: FC<ScheduleGridProps> = ({
  scheduleId,
  onOpenHistory,
  onOpenTree,
  onOpenAvailability,
  onOpenAutoShift,
  onConfirm,
  worldLineUrl,
  treeUrl,
  availabilityUrl,
  autoShiftUrl,
  dayBubbleUrl,
  violationBubbleUrl,
  ruleBubbleUrl,
  reportBubbleUrl,
  reservationInfoUrl,
  onOpenRule,
}) => {
  useSeedHotelData();
  const store = useAppStore();
  const { scope } = useScheduleHistory(scheduleId ?? "");
  const apex = scope.graph.getApex();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const staffList = useObjects<Staff>(STAFF_TYPE);
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
  const { object: schedule, update } = useObjectShell<MonthlyStaffSchedule>(
    SCHEDULE_TYPE,
    scheduleId
  );

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
  const constraintsRepo = useObjectRepo<ScheduleConstraints>(SCHEDULE_CONSTRAINTS_TYPE);
  const leaderRules = useMemo(() => constraints?.leaderRules ?? [], [constraints]);

  // 参考として紐づけたシフト完成レポート（次回シフト作成のルール・配慮として使う）。
  // ドロップで紐づけ、自動シフトの実行前に staffList をこれで優先度づけする。
  const allReports = useObjects<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const reportRepo = useObjectRepo<ScheduleReport>(SCHEDULE_REPORT_TYPE);
  const linkedReports = useMemo(() => {
    const ids = constraints?.linkedReportIds ?? [];
    return allReports.filter((r) => ids.includes(r.id));
  }, [allReports, constraints]);

  const handleDropReportUrl = (url: string) => {
    const reportId = extractIdFromUrl(url);
    if (!reportId || !scheduleId) return;
    const base = constraints ?? new ScheduleConstraints({ scheduleId, leaderRules: [] });
    if (base.linkedReportIds.includes(reportId)) return; // 既に紐づいていれば何もしない
    constraintsRepo.save(base.linkReport(reportId));
  };
  const handleUnlinkReport = (reportId: string) => {
    if (!constraints) return;
    constraintsRepo.save(constraints.unlinkReport(reportId));
  };

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
  // 選択が空＝全員のときは、担当者のいるルールすべてが対象になる。相方裏ボタンはこれごとに出す。
  const relevantRules = useMemo(() => {
    const idSet = new Set(subsetStaff.map((s) => s.id));
    return leaderRules.filter(
      (r) => r.leaderStaffIds.length > 0 && r.leaderStaffIds.every((id) => idSet.has(id))
    );
  }, [leaderRules, subsetStaff]);

  // 自動シフトコマンド（希望を叶える＋関係ルールごとの相方裏）。ExtractedSchedule と同じ組み立て。
  const steps = useMemo<AutoShiftStep[]>(
    () => [fulfillWishesStep, ...relevantRules.map((rule) => makePartnerCoverStep(rule))],
    [relevantRules]
  );

  // 責任者ルールを後から追加する。新しいルール（担当勤務帯は先頭の勤務帯・候補者は空）を
  // 制約集約に足して保存し、その場で編集バブルを開く。人の集合と時間帯はそこで編集する。
  const handleAddRule = () => {
    if (!scheduleId) return;
    const key = newLeaderRuleKey();
    const base =
      constraints ?? new ScheduleConstraints({ scheduleId, leaderRules: [] });
    constraintsRepo.save(
      base.addRule({
        key,
        label: "新責任者",
        shiftName: workShifts[0]?.name ?? "",
        leaderStaffIds: [],
        minCount: 1,
      })
    );
    onOpenRule?.(key);
  };

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
  const allConstraints = useMemo(() => {
    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    return buildScheduleConstraints({
      modelConstraints: constraints?.modelConstraints(shiftIdsOf),
      wish: (constraints?.checkShiftWish ?? true) ? { wishByStaff, shiftNameById } : undefined,
    });
  }, [workShifts, constraints, wishByStaff]);

  const violations = useMemo(
    () => (schedule ? schedule.checkConstraints(allConstraints) : []),
    [schedule, allConstraints]
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

  // セル編集: シェルにメソッドを実行するだけ → 監視している世界線すべてへ自動保存
  const handleChangeCell = (staffId: string, day: WorkingDay, to: ShiftCell) => {
    update((s) => s.setCell(staffId, day, to));
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
    });
    update(() => result.schedule);
    setAutoMessage(`${step.label}: ${result.message}`);
  };

  // 完成案の複数生成：対象スタッフについて「毎日 担当勤務帯に責任者が最低1人いる」かつ
  // 「全員が月◯日休む（1日◯人まで）」を満たす完成案を phase 違いで N 案つくり、
  // それぞれ独立した世界線（兄弟ブランチ）に書く。
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
      }).schedule;
    const buildCandidate = (phase: number): MonthlyStaffSchedule => {
      let s = schedule;
      s = runOn(s, fulfillWishesStep);
      s = runOn(s, makeSatisfyLeaderRulesStep(relevantRules, { phase }));
      s = runOn(s, makeMinDayOffStep(minDayOff, { maxPerDay, phase }));
      return s;
    };
    const candidates = Array.from({ length: DAY_OFF_CANDIDATE_COUNT }, (_, i) => ({
      obj: buildCandidate(i),
      label: `案${i + 1}`,
    }));
    commitCandidates(
      store,
      localScopeId(SCHEDULE_TYPE, scheduleId),
      SCHEDULE_TYPE,
      schedule,
      candidates
    );
    setAutoMessage(
      `${DAY_OFF_CANDIDATE_COUNT}案を世界線に作成し、案1を表示中です。世界線ビューで切り替えて見比べてください。`
    );
  };

  // 必要スタッフ数の編集（その日・全日）。同じくシェル経由で保存される
  const handleChangeRequired = (day: WorkingDay, shiftName: string, count: number) => {
    update((s) => s.setRequired(day, shiftName, count));
  };
  const handleChangeRequiredAllDays = (shiftName: string, count: number) => {
    update((s) => s.setRequiredForAllDays(shiftName, count));
  };

  // 「完成レポートを作成」: apex の勤務表状態からレポートを計算して保存し、
  // apex に確定ラベルを付ける（未命名なら既定ラベルを自動生成。既に名前が
  // 付いていれば尊重してそのまま残す）。レポートを開くのは app 層（onConfirm）の関心事。
  const handleConfirm = () => {
    if (!scheduleId || !apex) return;
    const apexSchedule = scope.getObjectAt<MonthlyStaffSchedule>(
      apex.id,
      SCHEDULE_TYPE,
      scheduleId
    );
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
      onClick={handleConfirm}
      title="今表示している勤務表を確定し、譲歩・繁忙日対応・貢献度のレポートを作成します"
    >
      🏁 完成レポートを作成
    </button>
  );

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          勤務表{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月 / {schedule.storeId}
          </span>
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
        </div>

        {/* 右：自動シフトは独立バブル。ここはそれを開くボタンだけ */}
        <div className="e-actions e-actions-right">
          {onOpenAutoShift &&
            withUrl(
              autoShiftUrl,
              <button
                type="button"
                className="e-link e-auto-open"
                onClick={onOpenAutoShift}
                title="自動シフトのパネルを開く"
              >
                🪄 自動シフト
              </button>
            )}
        </div>
      </div>

      {/* 参考として紐づけたシフト完成レポート。ルール帯とは別エリア（レポート一覧バブルから
          ドラッグで紐づけ、自動シフトの優先度に使う。詳しくは reportPriority.ts）。 */}
      <LinkedReportsView
        reports={linkedReports}
        onDropUrl={handleDropReportUrl}
        dropAcceptTypes={[getDragType(SCHEDULE_REPORT_TYPE)]}
        onUnlink={handleUnlinkReport}
      />

      {/* 適用中の制約を動的アイコンで描く（稼働日ごと↕ / 人ごと↔ / 全体） */}
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
        />
      </div>

      {/* 自動シフト操作バー。対象＝選択スタッフ（選択が無ければ全員）。 */}
      <div className="e-auto-bar">
        <span className="e-auto-target">
          対象:{" "}
          {selectedIds.length > 0 ? (
            <>
              選択 {selectedIds.length} 名
              <button
                type="button"
                className="e-auto-clear"
                onClick={() => setSelectedStaffIds(new Set())}
                title="選択を解除"
              >
                解除
              </button>
            </>
          ) : (
            "全員"
          )}
        </span>
        {steps.map((step) => (
          <button
            key={step.key}
            type="button"
            className="e-auto"
            title={step.description}
            onClick={() => handleRunStep(step)}
          >
            {step.label}
          </button>
        ))}
        <button
          type="button"
          className="e-candidate-run"
          title={`この ${subsetStaff.length} 名について「毎日 責任者が入る＋全員 月${minDayOff}日休む（1日${maxPerDay}人まで）」完成案を ${DAY_OFF_CANDIDATE_COUNT} つくり、それぞれ別の世界線に書いて見比べます。`}
          onClick={handleGenerateCandidates}
        >
          🌱 完成案を{DAY_OFF_CANDIDATE_COUNT}つ世界線に作る
        </button>
      </div>

      {autoMessage && (
        <div className="e-auto-message">
          {autoMessage}
          <button
            type="button"
            className="e-auto-close"
            aria-label="閉じる"
            onClick={() => setAutoMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* 左下：世界線ビュー。ボタンから link bubble が伸びる（bubble-side で開く） */}
      {onOpenHistory && (
        <div className="e-footer">
          {withUrl(
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
    .e-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    /* スタッフ関連の操作は左に、自動シフトは右に寄せる */
    .e-actions-right {
      margin-left: auto;
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
    /* 自動シフトを開くボタンは紫系で自動シフトらしさを出す */
    .e-auto-open {
      border-color: #b39ddb;
      color: #5e35b1;
      font-weight: 600;
      &:hover {
        background: #ede7f6;
        border-color: #9575cd;
      }
    }
  }

  /* 適用ルールの帯 */
  .e-rules-strip {
    margin-bottom: 8px;
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

  .e-auto-message {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 6px 10px;
    background: #ede7f6;
    border: 1px solid #d1c4e9;
    border-radius: 6px;
    color: #4527a0;
    font-size: 0.82em;

    .e-auto-close {
      margin-left: auto;
      border: none;
      background: transparent;
      color: #7e57c2;
      font-size: 1.1em;
      line-height: 1;
      cursor: pointer;
      padding: 0 2px;

      &:hover {
        color: #4527a0;
      }
    }
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
