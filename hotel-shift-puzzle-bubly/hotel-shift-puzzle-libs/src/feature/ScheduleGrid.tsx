'use client';

import { FC, ReactNode, useMemo, useState } from "react";
import styled from "styled-components";
import { UrledPlace } from "@bublys-org/bubbles-ui";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  StaffMonthlyShiftWish,
  ScheduleConstraints,
  SHIFT_LEADER_CONSTRAINT,
  type WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import { LeaderRulesView } from "../ui/LeaderRulesView.js";
import { useObjects, useObject, useObjectShell, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { buildScheduleConstraints } from "./scheduleConstraints.js";
import {
  STAFF_TYPE,
  WORKSHIFT_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

type ScheduleGridProps = {
  scheduleId?: string;
  /** 世界線ビュー（左下）を開くハンドラ */
  onOpenHistory?: () => void;
  /** 可能勤務帯エディタ（左・スタッフ関連）を開くハンドラ */
  onOpenAvailability?: () => void;
  /** 自動シフトパネル（右上）を開くハンドラ */
  onOpenAutoShift?: () => void;
  /**
   * 各アクションバブルの URL（data-url アンカー用）。ボタンを UrledPlace で包むと、
   * そのボタンから link bubble が伸びる。openBubble する URL と一致させる。
   * URL スキームは app 層の関心事なので注入で受ける。
   */
  worldLineUrl?: string;
  availabilityUrl?: string;
  autoShiftUrl?: string;
  /**
   * 稼働日詳細バブルの URL を作る（稼働日キーを渡す）。URL スキームは app 層の関心事なので
   * バブルルート側から注入してもらう。グリッドはこれを ObjectView に渡すだけ。
   */
  dayBubbleUrl?: (dayKey: string) => string;
  /** 違反バブルの URL を作る（違反 key を渡す）。同上・app 層から注入。 */
  violationBubbleUrl?: (violationKey: string) => string;
  /** 抽出バブルを開くハンドラ。選択中スタッフID群を渡す */
  onOpenExtract?: (staffIds: string[]) => void;
  /** 抽出バブルの URL を作る（選択中スタッフID群）。抽出ボタンの data-url に使う */
  extractBubbleUrl?: (staffIds: string[]) => string;
  /** ルール可視化バブルの URL を作る（ロールキー）。上部ルール行の ObjectView に渡す */
  ruleBubbleUrl?: (ruleKey: string) => string;
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
  onOpenAvailability,
  onOpenAutoShift,
  worldLineUrl,
  availabilityUrl,
  autoShiftUrl,
  dayBubbleUrl,
  violationBubbleUrl,
  onOpenExtract,
  extractBubbleUrl,
  ruleBubbleUrl,
  onOpenRule,
}) => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const availability = useObject<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
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

  // 上部「📋 ルール」の責任者以外の行は、各制約が自己記述する describe() から導出する。
  const otherRules = useMemo(
    () =>
      allConstraints
        .filter((c) => !c.type.startsWith(SHIFT_LEADER_CONSTRAINT))
        .map((c) => ({ key: c.type, label: c.label, text: c.describe() })),
    [allConstraints]
  );

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  // セル編集: シェルにメソッドを実行するだけ → 監視している世界線すべてへ自動保存
  const handleChangeCell = (staffId: string, day: WorkingDay, to: ShiftCell) => {
    update((s) => s.setCell(staffId, day, to));
  };

  // 必要スタッフ数の編集（その日・全日）。同じくシェル経由で保存される
  const handleChangeRequired = (day: WorkingDay, shiftName: string, count: number) => {
    update((s) => s.setRequired(day, shiftName, count));
  };
  const handleChangeRequiredAllDays = (shiftName: string, count: number) => {
    update((s) => s.setRequiredForAllDays(shiftName, count));
  };

  // アクションボタンを URL（data-url）で包む。url があると、その URL のバブルを開いたとき
  // link bubble がこのボタンから伸びる（openBubble する URL と一致している必要がある）。
  const withUrl = (url: string | undefined, node: ReactNode): ReactNode =>
    url ? <UrledPlace url={url}>{node}</UrledPlace> : node;

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

      {/* 適用中の宣言的ルール（早責/夜責）を人が読める形で描く */}
      <div className="e-rules-strip">
        <LeaderRulesView
          rules={leaderRules}
          nameOf={nameOf}
          ruleBubbleUrl={ruleBubbleUrl}
          otherRules={otherRules}
          onAddRule={scheduleId && onOpenRule ? handleAddRule : undefined}
        />
      </div>

      {/* グリッド領域。選択中はスタッフ列の左に「抽出」ボタンを absolute で浮かべる */}
      <div className="e-grid-area">
        {onOpenExtract && selectedIds.length > 0 && (
          <div className="e-extract-float">
            {withUrl(
              extractBubbleUrl?.(selectedIds),
              <button
                type="button"
                className="e-extract"
                onClick={() => onOpenExtract(selectedIds)}
                title="選択したスタッフだけの勤務表を開く"
              >
                抽出 ({selectedIds.length})
              </button>
            )}
            <button
              type="button"
              className="e-extract-clear"
              onClick={() => setSelectedStaffIds(new Set())}
              title="選択を解除"
              aria-label="選択を解除"
            >
              ×
            </button>
          </div>
        )}

        <ScheduleGridView
          schedule={schedule}
          staffList={filteredStaffList}
          workShifts={workShifts}
          availability={availability}
          wishByStaff={wishByStaff}
          violations={violations}
          groupByDepartment={groupByDept}
          leaderRules={leaderRules}
          selectedStaffIds={selectedStaffIds}
          onToggleStaffSelected={onOpenExtract ? toggleStaffSelected : undefined}
          extractBubbleUrl={extractBubbleUrl}
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

  /* 選択中だけ、スタッフ列の左に浮かぶ抽出ボタン（absolute・フローに影響しない） */
  .e-extract-float {
    position: absolute;
    left: 4px;
    top: 4px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 4px 3px 6px;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 999px;
    box-shadow: 0 2px 8px hsla(0, 0%, 0%, 0.18);

    .e-extract {
      border: none;
      border-radius: 999px;
      background: #43a047;
      color: #fff;
      font-size: 0.8em;
      font-weight: 700;
      padding: 4px 12px;
      cursor: pointer;
      &:hover {
        background: #388e3c;
      }
    }
    .e-extract-clear {
      border: none;
      background: transparent;
      color: #2e7d32;
      font-size: 1.1em;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
      &:hover {
        color: #1b5e20;
      }
    }
  }

  /* 左下：世界線ビュー */
  .e-footer {
    margin-top: 8px;
    display: flex;
    align-items: center;
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
