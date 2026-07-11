'use client';

import { FC, Fragment, useMemo, useState } from "react";
import { ObjectView } from "@bublys-org/bubbles-ui";
import {
  Staff,
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ScheduleAvailability,
  ConstraintViolation,
  StaffMonthlyShiftWish,
  type ShiftCell,
  ShiftLeaderRule,
  SHIFT_LEADER_CONSTRAINT,
} from "../domain/index.js";
import { STAFF_COL_WIDTH, DAY_COL_WIDTH, OFF_COL_WIDTH } from "./schedule-grid/constants.js";
import { StyledWrap } from "./schedule-grid/styles.js";
import { wishEntriesFor } from "./schedule-grid/wishSummary.js";
import { buildSummaryRows } from "./schedule-grid/summaryModel.js";
import { StaffScheduleRow } from "./schedule-grid/StaffScheduleRow.js";
import {
  ConstraintHoverOverlay,
  type ConstraintHoverGroup,
} from "./schedule-grid/ConstraintHoverOverlay.js";
import { SummaryRow } from "./schedule-grid/SummaryRow.js";
import { RequiredEditMenu } from "./schedule-grid/EditMenus.js";
import { ShiftSuggestionDropdown } from "./schedule-grid/ShiftSuggestionDropdown.js";
import { useCellKeyboardEditing } from "./schedule-grid/useCellKeyboardEditing.js";
import type { EditingRequired } from "./schedule-grid/types.js";

type ScheduleGridViewProps = {
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  /** 勤務帯（独立集約）。勤務帯ID の解決に使う */
  workShifts: WorkShift[];
  /** 可能勤務帯。あればセル編集メニューを「そのスタッフが入れる勤務帯」に絞る */
  availability?: ScheduleAvailability;
  /** スタッフID → その月のシフト希望。各セル隅にマーカーで表示する */
  wishByStaff?: Map<string, StaffMonthlyShiftWish>;
  /** 制約違反の一覧。該当セルに赤線を引き、クリックで違反バブルを開く */
  violations?: ConstraintViolation[];
  /** true のとき部署別にグループ化して表示する */
  groupByDepartment?: boolean;
  /** 責任者の宣言的ルール（解決済み）。footer 先頭に早責/夜責などの ◯/✕ 行を出す */
  leaderRules?: ShiftLeaderRule[];
  /** true なら footer を責任者ルールの ◯/✕ 行だけにする（必要人数・休み行を出さない）。抽出ビュー用 */
  leaderRulesOnlyFooter?: boolean;
  /** セルの勤務割当を変更する */
  onChangeCell: (staffId: string, day: WorkingDay, to: ShiftCell) => void;
  /** 必要スタッフ数を変更する（その日・その勤務帯名） */
  onChangeRequired?: (day: WorkingDay, shiftName: string, count: number) => void;
  /** 必要スタッフ数を全稼働日にまとめて変更する（その勤務帯名） */
  onChangeRequiredAllDays?: (shiftName: string, count: number) => void;
  /**
   * 稼働日詳細バブルの URL。日付ヘッダの ObjectView に渡す（ダブルクリックで開く＋
   * origin-side で近くに出す data-url）。URL スキームは app 層の関心事なので注入で受ける。
   */
  dayBubbleUrl?: (day: WorkingDay) => string;
  /** 違反バブルの URL。違反マーカーの ObjectView に渡す（同上・app 層から注入）。 */
  violationUrl?: (violation: ConstraintViolation) => string;
  /** 抽出対象として選択中のスタッフID。onToggleStaffSelected があるとき名前左にチェックを出す */
  selectedStaffIds?: Set<string>;
  /** スタッフの抽出選択をトグルする */
  onToggleStaffSelected?: (staffId: string) => void;
  /** 責任者バッジのクリックで、そのルールの関係者を選択させるコールバック */
  onSelectRule?: (staffIds: string[]) => void;
  /** 月の最低休日数。これ未満のスタッフは右端の休み合計を赤くする（制約の可視化） */
  minDayOff?: number;
  /** 1日の休み人数の上限。footer の休み行でこれを超えた日を赤くする */
  maxDayOffPerDay?: number;
};

/**
 * スタッフを部署でグループ化した配列（順序付き）を返す。
 * 部署未設定のスタッフは最後の "（未設定）" グループに入る。
 */
function groupStaffByDepartment(
  staffList: Staff[]
): Array<{ dept: string; members: Staff[] }> {
  const map = new Map<string, Staff[]>();
  for (const staff of staffList) {
    const dept = staff.department || "";
    if (!map.has(dept)) map.set(dept, []);
    map.get(dept)!.push(staff);
  }
  // 未設定を末尾に
  const groups: Array<{ dept: string; members: Staff[] }> = [];
  let unset: Staff[] | undefined;
  for (const [dept, members] of map) {
    if (dept === "") {
      unset = members;
    } else {
      groups.push({ dept, members });
    }
  }
  if (unset) groups.push({ dept: "", members: unset });
  return groups;
}

/**
 * 勤務表グリッド（行=スタッフ / 列=日）のオーケストレーター。
 * 派生データの算出と描画に徹し、キーボード操作（選択・入力・候補）は
 * useCellKeyboardEditing に、見た目は schedule-grid/ 配下の子コンポーネントに委ねる。
 */
export const ScheduleGridView: FC<ScheduleGridViewProps> = ({
  schedule,
  staffList,
  workShifts,
  availability,
  wishByStaff,
  violations = [],
  groupByDepartment = false,
  leaderRules = [],
  leaderRulesOnlyFooter = false,
  onChangeCell,
  onChangeRequired,
  onChangeRequiredAllDays,
  dayBubbleUrl,
  violationUrl,
  selectedStaffIds,
  onToggleStaffSelected,
  onSelectRule,
  minDayOff,
  maxDayOffPerDay,
}) => {
  const days = schedule.workingDays();

  // 選択モード（誰か選択中）か。選択中は対象行を強調し、対象外の行を減光する。
  const focusActive = (selectedStaffIds?.size ?? 0) > 0;

  // 勤務帯ID → WorkShift の解決マップ（独立集約から渡される）
  const shiftMap = new Map(workShifts.map((w) => [w.id, w]));

  // 勤務帯名 → id（責任者ルールの担当勤務帯の色を引くため）
  const shiftIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of workShifts) if (!m.has(w.name)) m.set(w.name, w.id);
    return m;
  }, [workShifts]);

  // ホバー中セル（"staffId:dayKey"）。制約関係オーバーレイの起点。
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  // ホバー中セルの人が属する責任者ルールごとに、担当勤務帯（早番など）から全メンバーへ
  // ブレースを描くための情報を導く。制約がその日に満たされているかも添える。
  const hoverInfo = useMemo(() => {
    if (!hoveredCell) return null;
    const sep = hoveredCell.indexOf(":");
    if (sep < 0) return null;
    const staffId = hoveredCell.slice(0, sep);
    const dayKey = hoveredCell.slice(sep + 1);
    const day = days.find((d) => d.key === dayKey);
    const visible = new Set(staffList.map((s) => s.id));
    const shiftNameByIdLocal = new Map(workShifts.map((w) => [w.id, w.name]));
    const groups: ConstraintHoverGroup[] = [];
    for (const rule of leaderRules) {
      if (!rule.leaderStaffIds.includes(staffId)) continue;
      // 起点は「勤務帯」なので、本人も含めた表示中の全メンバーへ等しく線を伸ばす。
      const memberIds = rule.leaderStaffIds.filter((id) => visible.has(id));
      if (memberIds.length === 0) continue;
      // 各メンバーが「その日に担当勤務帯へ入っているか（充足に寄与しているか）」を添える。
      const members = memberIds.map((id) => {
        const st = day ? schedule.statusOf(id, day) : { kind: "undecided" as const };
        const covering =
          st.kind === "work" && shiftNameByIdLocal.get(st.shiftId) === rule.shiftName;
        return { staffId: id, covering };
      });
      // その日に責任者ルールが未充足なら違反が立つ（列警告と同じ導出）。無ければ充足。
      const vtype = `${SHIFT_LEADER_CONSTRAINT}:${rule.key}`;
      const satisfied = day
        ? !violations.some((v) => v.constraintType === vtype && v.coversDay(day))
        : true;
      // メンバー全員がその日に休み＝誰も入れず絶対に満たせない（黄色・同時点滅で警告）。
      const allDayOff = !!day && memberIds.every((id) => schedule.isDayOff(id, day));
      groups.push({
        shiftId: shiftIdByName.get(rule.shiftName),
        shiftName: rule.shiftName,
        members,
        satisfied,
        allDayOff,
      });
    }
    if (groups.length === 0) return null;
    return { dayKey, groups };
  }, [hoveredCell, leaderRules, staffList, shiftIdByName, days, violations, schedule, workShifts]);

  // この勤務表で選べる勤務帯（勤務表の WorkShiftSet から渡される。開始時刻昇順）
  const shiftOptions = workShifts;

  // 各稼働日の勤務帯ID別人数 / 休み人数（集約のクエリ）→ 集計行を組み立てる。
  const countsByDay = days.map((day) => schedule.countWorkingByShift(day));
  const dayOffByDay = days.map((day) => schedule.countDayOffOn(day));
  const summaryRows = buildSummaryRows(
    schedule,
    days,
    shiftOptions,
    countsByDay,
    dayOffByDay,
    leaderRules,
    leaderRulesOnlyFooter,
    maxDayOffPerDay
  );

  // 日単位の違反（責任者不在など、staffId なし）を稼働日キーごとにまとめる。日付ヘッダの
  // 列警告に使う（スタッフ×日の違反は従来どおり行の赤線で出る）。
  const dayWarnings = useMemo(() => {
    const m = new Map<string, ConstraintViolation[]>();
    for (const v of violations) {
      if (!v.isDayScoped) continue;
      for (const d of v.days) {
        const arr = m.get(d.key) ?? [];
        arr.push(v);
        m.set(d.key, arr);
      }
    }
    return m;
  }, [violations]);

  // 責任者行の未充足 ✕（rule×day）に対応する違反 → その URL を引く。footer の ✕ の導線に使う。
  const leaderViolationUrl = useMemo(() => {
    if (!violationUrl) return undefined;
    return (ruleKey: string, day: WorkingDay): string | undefined => {
      const type = `${SHIFT_LEADER_CONSTRAINT}:${ruleKey}`;
      const v = violations.find(
        (x) => x.constraintType === type && x.coversDay(day)
      );
      return v ? violationUrl(v) : undefined;
    };
  }, [violations, violationUrl]);

  const getWishEntries = (staffId: string, day: WorkingDay) =>
    wishEntriesFor(wishByStaff, staffId, day);

  // キーボード操作（セル選択・矢印移動・打ち込みでの勤務帯確定）はフックに委譲
  const kb = useCellKeyboardEditing({
    staffList,
    days,
    shiftOptions,
    availability,
    onChangeCell,
  });

  // 希望と割当を並べて見るために展開中のスタッフID
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (staffId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });

  // ----- 必要人数の編集メニュー -----
  const [editingRequired, setEditingRequired] = useState<EditingRequired | null>(null);
  // 必要人数として選べる最大値（スタッフ総数まで）
  const maxRequired = Math.max(staffList.length, 1);
  const applyRequired = (count: number) => {
    if (editingRequired) {
      if (editingRequired.day) {
        onChangeRequired?.(editingRequired.day, editingRequired.shiftName, count);
      } else {
        onChangeRequiredAllDays?.(editingRequired.shiftName, count);
      }
    }
    setEditingRequired(null);
  };

  const gridTemplateColumns = `${STAFF_COL_WIDTH}px repeat(${days.length}, ${DAY_COL_WIDTH}px) ${OFF_COL_WIDTH}px`;

  // 部署グルーピング時は department ヘッダー行を挿入してスタッフ行を並べる
  const renderStaffRows = () => {
    if (!groupByDepartment) {
      return staffList.map((staff) => (
        <StaffScheduleRow
          key={staff.id}
          staff={staff}
          days={days}
          schedule={schedule}
          shiftMap={shiftMap}
          violations={violations}
          getWishEntries={getWishEntries}
          expanded={expanded.has(staff.id)}
          onToggleExpand={toggleExpanded}
          selection={kb.selection}
          inputBuffer={kb.inputBuffer}
          onSelectCell={kb.selectCell}
          onOpenEditor={kb.openEditor}
          violationUrl={violationUrl}
          selected={selectedStaffIds?.has(staff.id)}
          onToggleSelected={onToggleStaffSelected}
          leaderRules={leaderRules}
          onSelectRule={onSelectRule}
          focused={focusActive && !!selectedStaffIds?.has(staff.id)}
          dimmed={focusActive && !selectedStaffIds?.has(staff.id)}
          minDayOff={minDayOff}
        />
      ));
    }

    const groups = groupStaffByDepartment(staffList);
    // Fragment を使って grid の直接の子として展開する（span で包むとグリッドが崩れる）
    return groups.flatMap(({ dept, members }) => [
      <Fragment key={`dept-header:${dept || "__none__"}`}>
        {/* 部署名（左固定） ＋ 日列分のセパレーター */}
        <div className="e-dept-label">
          {dept || "（部署未設定）"}
        </div>
        <div
          className="e-dept-sep"
          style={{ gridColumn: `2 / ${days.length + 3}` }}
        />
      </Fragment>,
      ...members.map((staff) => (
        <StaffScheduleRow
          key={staff.id}
          staff={staff}
          days={days}
          schedule={schedule}
          shiftMap={shiftMap}
          violations={violations}
          getWishEntries={getWishEntries}
          expanded={expanded.has(staff.id)}
          onToggleExpand={toggleExpanded}
          selection={kb.selection}
          inputBuffer={kb.inputBuffer}
          onSelectCell={kb.selectCell}
          onOpenEditor={kb.openEditor}
          violationUrl={violationUrl}
          selected={selectedStaffIds?.has(staff.id)}
          onToggleSelected={onToggleStaffSelected}
          leaderRules={leaderRules}
          onSelectRule={onSelectRule}
          focused={focusActive && !!selectedStaffIds?.has(staff.id)}
          dimmed={focusActive && !selectedStaffIds?.has(staff.id)}
          minDayOff={minDayOff}
        />
      )),
    ]);
  };

  return (
    <StyledWrap>
      <div
        className="e-grid"
        style={{ gridTemplateColumns }}
        ref={kb.gridRef}
        tabIndex={0}
        role="grid"
        onKeyDown={kb.handleKeyDown}
        onMouseOver={(e) => {
          const el = (e.target as HTMLElement).closest("[data-cell-key]");
          const key = el?.getAttribute("data-cell-key") ?? null;
          setHoveredCell((prev) => (prev === key ? prev : key));
        }}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {/* ヘッダ行: 左上の角 + 日付ヘッダ + 右上の休合計ヘッダ */}
        <div className="e-corner">
          {schedule.year}年{schedule.month}月
        </div>
        {days.map((day) => {
          const wd = day.weekday; // 0=日 6=土
          const warns = dayWarnings.get(day.key);
          const inner = (
            <span className="e-day-inner" title={`${day.label} の詳細を開く（ダブルクリック）`}>
              <span className="e-day-num">{day.day}</span>
              <span className="e-day-wd">{["日", "月", "火", "水", "木", "金", "土"][wd]}</span>
            </span>
          );
          return (
            <div
              key={day.key}
              className={`e-day-head${dayBubbleUrl ? " is-clickable" : ""}${
                wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""
              }${warns ? " is-warn" : ""}`}
            >
              {warns &&
                (() => {
                  const mark = (
                    <span
                      className="e-day-warn"
                      title={warns.map((v) => v.message).join("\n")}
                    >
                      ⚠
                    </span>
                  );
                  // ダブルクリックでその日の（先頭の）違反バブルを開く
                  return violationUrl ? (
                    <ObjectView
                      url={violationUrl(warns[0])}
                      openingPosition="origin-side"
                      draggable={false}
                    >
                      {mark}
                    </ObjectView>
                  ) : (
                    mark
                  );
                })()}
              {/* ObjectView がダブルクリックでの展開・data-url（origin-side で近くに出す）を担う。
                  展開先 URL は app 層から注入される（dayBubbleUrl）。 */}
              {dayBubbleUrl ? (
                <ObjectView
                  url={dayBubbleUrl(day)}
                  openingPosition="origin-side"
                  draggable={false}
                  fullWidth
                >
                  {inner}
                </ObjectView>
              ) : (
                inner
              )}
            </div>
          );
        })}
        <div className="e-off-head">休</div>

        {/* スタッフ行（部署グルーピングあり/なし） */}
        {renderStaffRows()}

        {/* 勤務帯ごと＋休みの人数集計（スタッフ行の後） */}
        {summaryRows.map((row, rowIndex) => (
          <SummaryRow
            key={`sum:${row.key}`}
            row={row}
            days={days}
            rowIndex={rowIndex}
            editable={!!row.required && !!(onChangeRequired || onChangeRequiredAllDays)}
            onEditRequired={setEditingRequired}
            leaderViolationUrl={leaderViolationUrl}
          />
        ))}

        {/* ホバー中セルの制約関係（同じ責任者ルールの相手へ線を引く）を重ねる。
            .e-grid を基準に content 座標で絶対配置するので、スクロールに追従する。 */}
        {hoverInfo && (
          <ConstraintHoverOverlay
            gridRef={kb.gridRef}
            dayKey={hoverInfo.dayKey}
            groups={hoverInfo.groups}
          />
        )}
      </div>

      <RequiredEditMenu
        editingRequired={editingRequired}
        maxRequired={maxRequired}
        onClose={() => setEditingRequired(null)}
        onApply={applyRequired}
      />

      {/* 勤務割当を選ぶ統合ドロップダウン（キーボード入力の候補 / ダブルクリックの選択肢を一本化） */}
      <ShiftSuggestionDropdown
        open={kb.editing}
        anchorEl={kb.anchorEl}
        suggestions={kb.suggestions}
        activeIndex={kb.activeIndex}
        onPick={kb.applySuggestion}
      />
    </StyledWrap>
  );
};
