import { FC, Fragment } from "react";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView, UrledPlace } from "@bublys-org/bubbles-ui";
import type {
  Staff,
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ConstraintViolation,
  ShiftLeaderRule,
} from "../../domain/index.js";
import { ScheduleDataCell } from "./ScheduleDataCell.js";
import { wishText, type WishEntry } from "./wishSummary.js";

type StaffScheduleRowProps = {
  staff: Staff;
  days: WorkingDay[];
  schedule: MonthlyStaffSchedule;
  /** 勤務帯ID → WorkShift の解決マップ */
  shiftMap: Map<string, WorkShift>;
  violations: ConstraintViolation[];
  /** スタッフ×日 → 希望エントリ */
  getWishEntries: (staffId: string, day: WorkingDay) => WishEntry[];
  /** 希望行を開いているか */
  expanded: boolean;
  onToggleExpand: (staffId: string) => void;
  onEditCell: (anchor: HTMLElement, staffId: string, day: WorkingDay) => void;
  /** 違反バブルの URL を作る。ObjectView がこれで開く（origin-side でマーカーの近くに出す） */
  violationUrl?: (violation: ConstraintViolation) => string;
  /** このスタッフが抽出対象に選択されているか（onToggleSelected があるときだけ表示） */
  selected?: boolean;
  /** スタッフの選択をトグルする。渡されたときだけ名前左にチェックボックスを出す */
  onToggleSelected?: (staffId: string) => void;
  /** 責任者ルール（解決済み）。このスタッフが属するルールを名前横のバッジに出す */
  leaderRules?: ShiftLeaderRule[];
  /** 責任者バッジをクリックしたとき、そのルールの関係者だけを抽出する */
  onOpenExtract?: (staffIds: string[]) => void;
  /** 抽出バブルの URL（バッジの data-url アンカー用。link bubble がバッジから伸びる） */
  extractBubbleUrl?: (staffIds: string[]) => string;
};

/**
 * スタッフ 1 人ぶんの行。
 * 左ヘッダ（名前・希望行トグル）＋各日のセル＋右端の休み合計。展開時は希望行を真下に並べる。
 * grid の直接の子になるよう Fragment で並べる。
 */
export const StaffScheduleRow: FC<StaffScheduleRowProps> = ({
  staff,
  days,
  schedule,
  shiftMap,
  violations,
  getWishEntries,
  expanded,
  onToggleExpand,
  onEditCell,
  violationUrl,
  selected,
  onToggleSelected,
  leaderRules = [],
  onOpenExtract,
  extractBubbleUrl,
}) => {
  // このスタッフが属する責任者ルール → 名前横のバッジ。クリックでその関係者を抽出。
  const myRules = leaderRules.filter((r) => r.leaderStaffIds.includes(staff.id));
  return (
    <>
      {/* スタッフ名（行ヘッダ）: ObjectView でダブルクリック展開 / ドラッグ。
          名前クリックで希望行の開閉。左に抽出用チェックボックス（任意）。 */}
      <div className="e-staff-cell">
        {onToggleSelected && (
          <input
            type="checkbox"
            className="e-staff-check"
            checked={!!selected}
            title="抽出対象として選択"
            onChange={() => onToggleSelected(staff.id)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <ObjectView
          object={staff}
          label={staff.name}
          draggable={true}
          openingPosition="origin-side"
          fullWidth={true}
        >
          <div
            className="e-staff"
            role="button"
            title="クリックで希望を表示/非表示"
            onClick={() => onToggleExpand(staff.id)}
          >
            <span className="e-caret">{expanded ? "▾" : "▸"}</span>
            <PersonIcon fontSize="small" className="e-staff-icon" />
            <span className="e-staff-name">{staff.name}</span>
            {myRules.map((rule) => {
              const clickable = !!onOpenExtract;
              const badge = (
                <span
                  className={`e-leader-badge is-${rule.key}${clickable ? " is-clickable" : ""}`}
                  title={
                    clickable
                      ? `${rule.label}の関係者だけを抽出`
                      : `${rule.label}（${rule.shiftName}責任者）`
                  }
                  role={clickable ? "button" : undefined}
                  onClick={
                    clickable
                      ? (e) => {
                          e.stopPropagation(); // 行展開やスタッフ展開はしない
                          onOpenExtract(rule.leaderStaffIds);
                        }
                      : undefined
                  }
                >
                  {rule.label}
                </span>
              );
              // data-url を埋めると、抽出バブルがこのバッジから link bubble で伸びる
              return clickable && extractBubbleUrl ? (
                <UrledPlace key={rule.key} url={extractBubbleUrl(rule.leaderStaffIds)}>
                  {badge}
                </UrledPlace>
              ) : (
                <Fragment key={rule.key}>{badge}</Fragment>
              );
            })}
          </div>
        </ObjectView>
      </div>

      {/* 各稼働日のセル */}
      {days.map((day) => {
        const cell = schedule.statusOf(staff.id, day);
        const shift = cell.kind === "work" ? shiftMap.get(cell.shiftId) : undefined;
        const covering = violations.filter((v) => v.coversCell(staff.id, day));
        return (
          <ScheduleDataCell
            key={`${staff.id}:${day.key}`}
            cell={cell}
            shift={shift}
            wishEntries={getWishEntries(staff.id, day)}
            rangeViolation={covering.find((v) => v.days.length > 1)}
            pointViolation={covering.find((v) => v.days.length === 1)}
            onClick={(anchor) => onEditCell(anchor, staff.id, day)}
            violationUrl={violationUrl}
          />
        );
      })}

      {/* 右端: そのスタッフの月内休み合計 */}
      <div className="e-off-total" title={`${staff.name} の休み合計`}>
        {schedule.countDayOffForStaff(staff.id)}
      </div>

      {/* 展開時: 希望行（割当行の真下に並べて比較できる） */}
      {expanded && (
        <>
          <div className="e-wish-row-head">（希望）</div>
          {days.map((day) => {
            const entries = getWishEntries(staff.id, day);
            return (
              <div key={`wish:${staff.id}:${day.key}`} className="e-wish-row-cell">
                {entries.length > 0 ? (
                  entries.map((e, i) => (
                    <span key={i} className={e.pref === "want" ? "is-want" : "is-avoid"}>
                      {wishText(e)}
                    </span>
                  ))
                ) : (
                  <span className="e-empty">・</span>
                )}
              </div>
            );
          })}
          {/* 休合計列ぶんの空セル（グリッド整列用） */}
          <div className="e-off-total e-off-filler" />
        </>
      )}
    </>
  );
};
