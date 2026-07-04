import { FC } from "react";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type {
  Staff,
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ConstraintViolation,
  ShiftLeaderRule,
} from "../../domain/index.js";
import { MIN_MONTHLY_DAY_OFF_CONSTRAINT } from "../../domain/index.js";
import { ScheduleDataCell } from "./ScheduleDataCell.js";
import { LeaderBadges } from "../LeaderBadges.js";
import { wishText, type WishEntry } from "./wishSummary.js";
import type { CellSelection } from "./types.js";

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
  /** キーボード操作でフォーカス中のセル（無ければ null） */
  selection: CellSelection | null;
  /** 選択セルで入力中のバッファ（Enter 確定前の文字列。null は非入力） */
  inputBuffer: string | null;
  onToggleExpand: (staffId: string) => void;
  /** セルをシングルクリックで選択 */
  onSelectCell: (staffId: string, day: WorkingDay) => void;
  /** セルをダブルクリックで候補ドロップダウンを開く */
  onOpenEditor: (staffId: string, day: WorkingDay) => void;
  /** 違反バブルの URL を作る。ObjectView がこれで開く（origin-side でマーカーの近くに出す） */
  violationUrl?: (violation: ConstraintViolation) => string;
  /** このスタッフが抽出対象に選択されているか（onToggleSelected があるときだけ表示） */
  selected?: boolean;
  /** スタッフの選択をトグルする。渡されたときだけ名前左にチェックボックスを出す */
  onToggleSelected?: (staffId: string) => void;
  /** 責任者ルール（解決済み）。このスタッフが属するルールを名前横のバッジに出す */
  leaderRules?: ShiftLeaderRule[];
  /** 抽出バブルの URL（責任者バッジの ObjectView に渡す。ダブルクリックで関係者を抽出） */
  extractBubbleUrl?: (staffIds: string[]) => string;
  /** 月の最低休日数。これ未満なら右端の休み合計を赤くする（制約の可視化） */
  minDayOff?: number;
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
  selection,
  inputBuffer,
  onToggleExpand,
  onSelectCell,
  onOpenEditor,
  violationUrl,
  selected,
  onToggleSelected,
  leaderRules = [],
  extractBubbleUrl,
  minDayOff,
}) => {
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
            <LeaderBadges
              rules={leaderRules}
              staffId={staff.id}
              extractBubbleUrl={extractBubbleUrl}
            />
          </div>
        </ObjectView>
      </div>

      {/* 各稼働日のセル */}
      {days.map((day) => {
        const cell = schedule.statusOf(staff.id, day);
        const shift = cell.kind === "work" ? shiftMap.get(cell.shiftId) : undefined;
        const covering = violations.filter((v) => v.coversCell(staff.id, day));
        const isSelected =
          selection?.staffId === staff.id && selection.day.equals(day);
        return (
          <ScheduleDataCell
            key={`${staff.id}:${day.key}`}
            cell={cell}
            shift={shift}
            wishEntries={getWishEntries(staff.id, day)}
            rangeViolation={covering.find((v) => v.days.length > 1)}
            pointViolation={covering.find((v) => v.days.length === 1)}
            cellKey={`${staff.id}:${day.key}`}
            selected={isSelected}
            inputBuffer={isSelected ? inputBuffer : null}
            onSelect={() => onSelectCell(staff.id, day)}
            onOpenEditor={() => onOpenEditor(staff.id, day)}
            violationUrl={violationUrl}
          />
        );
      })}

      {/* 右端: そのスタッフの月内休み合計。最低休日数未満なら赤くし、違反バブルを開ける */}
      {(() => {
        const offCount = schedule.countDayOffForStaff(staff.id);
        const underMin = minDayOff !== undefined && offCount < minDayOff;
        const violation = underMin
          ? violations.find(
              (v) =>
                v.constraintType === MIN_MONTHLY_DAY_OFF_CONSTRAINT &&
                v.staffId === staff.id
            )
          : undefined;
        const url = violation && violationUrl ? violationUrl(violation) : undefined;
        return (
          <div
            className={`e-off-total${underMin ? " is-under-min" : ""}${
              url ? " is-clickable" : ""
            }`}
            title={
              underMin
                ? `${staff.name} の休み ${offCount}日（最低${minDayOff}日）${
                    url ? "。ダブルクリックで違反を開く" : ""
                  }`
                : `${staff.name} の休み合計`
            }
          >
            {url ? (
              <ObjectView
                url={url}
                openingPosition="origin-side"
                draggable={false}
                fullWidth
              >
                <span className="e-off-mark">{offCount}</span>
              </ObjectView>
            ) : (
              offCount
            )}
          </div>
        );
      })()}

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
