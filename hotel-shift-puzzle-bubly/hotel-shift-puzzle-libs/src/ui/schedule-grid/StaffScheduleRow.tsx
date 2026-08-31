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
import type { WishEntry } from "./wishSummary.js";
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
  /** キーボード操作でフォーカス中のセル（無ければ null） */
  selection: CellSelection | null;
  /** 選択セルで入力中のバッファ（Enter 確定前の文字列。null は非入力） */
  inputBuffer: string | null;
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
  /** 責任者バッジをクリックしたときに、そのルールの関係者を選択させるコールバック */
  onSelectRule?: (staffIds: string[]) => void;
  /** 選択モード中で、この行が選択対象（強調＝少し浮かせる） */
  focused?: boolean;
  /** 選択モード中で、この行が対象外（減光＝blur でぼかす） */
  dimmed?: boolean;
  /** 月の最低休日数。これ未満なら右端の休み合計を赤くする（制約の可視化） */
  minDayOff?: number;
};

/**
 * スタッフ 1 人ぶんの行。
 * 左ヘッダ（名前）＋各日のセル＋右端の休み合計。grid の直接の子になるよう Fragment で並べる。
 * 希望は各セルの円で読めるので、行を展開して希望行を出す機能は持たない。
 */
export const StaffScheduleRow: FC<StaffScheduleRowProps> = ({
  staff,
  days,
  schedule,
  shiftMap,
  violations,
  getWishEntries,
  selection,
  inputBuffer,
  onSelectCell,
  onOpenEditor,
  violationUrl,
  selected,
  onToggleSelected,
  leaderRules = [],
  onSelectRule,
  focused,
  dimmed,
  minDayOff,
}) => {
  // 選択モード中の行の見た目：選択対象は強調（浮かせる）、対象外は減光（blur）。
  // 行は grid の直接の子（名前セル＋各日セル＋休合計）なので、各セルに同じクラスを付ける。
  const rowMod = focused ? " is-focused" : dimmed ? " is-dimmed" : "";
  return (
    <>
      {/* スタッフ名（行ヘッダ）: ObjectView でダブルクリック展開（bubble-side-left）/ ドラッグ。
          左に抽出用チェックボックス（任意）。 */}
      <div className={`e-staff-cell${rowMod}`}>
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
          openingPosition="bubble-side-left"
          fullWidth={true}
        >
          <div className="e-staff" title="ダブルクリックでスタッフ詳細を開く">
            <PersonIcon fontSize="small" className="e-staff-icon" />
            <span className="e-staff-name">{staff.name}</span>
            <span className="e-staff-badges">
              <LeaderBadges
                rules={leaderRules}
                staffId={staff.id}
                onSelectRule={onSelectRule}
              />
            </span>
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
            cellClassName={rowMod.trim() || undefined}
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
            }${rowMod}`}
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

    </>
  );
};
