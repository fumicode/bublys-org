'use client';

import { FC, useCallback, useMemo, useState } from "react";
import {
  WorkingDay,
  MonthlyStaffSchedule,
  Staff,
  StaffMonthlyShiftWish,
  WorkingStaffGroup,
  type ConfirmedDayOffReason,
  type ShiftWishPreference,
  type StaffRow,
  type FormatInput,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import {
  useObject,
  useObjectRepo,
  useObjects,
} from "../objects/repository.js";
import { ShiftExcelView } from "../ui/ShiftExcelView.js";
import { importShiftFromExcel } from "./shiftExcelImport.js";
import { downloadShiftExcel } from "./shiftExcelExport.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { recordMembershipEdit } from "./recordScheduleEdit.js";
import {
  SCHEDULE_TYPE,
  STAFF_TYPE,
  WORKING_STAFF_GROUP_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

export const ShiftExcelPanel: FC<{
  scheduleId: string;
}> = (props) => (
  <ScheduleWorld scheduleId={props.scheduleId}>
    <ShiftExcelPanelInner scheduleId={props.scheduleId} />
  </ScheduleWorld>
);

const ShiftExcelPanelInner: FC<{
  scheduleId: string;
}> = ({ scheduleId }) => {
  const store = useAppStore();
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const roster = useObjects<Staff>(STAFF_TYPE);
  const staffGroup = useObject<WorkingStaffGroup>(WORKING_STAFF_GROUP_TYPE, scheduleId);
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const staffList = useMemo(
    () => (staffGroup ? staffGroup.resolve(roster) : roster),
    [staffGroup, roster],
  );

  const wishRepo = useObjectRepo<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "warn" | "error"; text: string } | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const handleImport = useCallback(async (file: File) => {
    if (!schedule) return;
    setBusy(true);
    setMessage(null);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();

      const staffByName = new Map(
        staffList.map((s: Staff) => [s.name, s.id] as const),
      );
      const { converted } = importShiftFromExcel(
        buffer,
        (name: string) => staffByName.get(name) ?? `imported-${name}`,
      );

      // 名簿にないスタッフを臨時の人として WorkingStaffGroup に追加
      const unmatchedResults = converted.staffResults
        .filter((s) => !staffByName.has(s.name));

      if (unmatchedResults.length > 0 && staffGroup) {
        let updatedGroup = staffGroup;
        for (const result of unmatchedResults) {
          const staffId = `imported-${result.name}`;
          if (!updatedGroup.has(staffId)) {
            const tempStaff = new Staff({ id: staffId, name: result.name });
            updatedGroup = updatedGroup.addTemporary(tempStaff);
          }
        }
        if (updatedGroup !== staffGroup) {
          recordMembershipEdit(store, {
            scheduleId,
            schedule,
            changed: [{ type: WORKING_STAFF_GROUP_TYPE, obj: updatedGroup }],
          });
        }
      }

      // 希望を保存（external なので世界線とは別に保存）
      let savedCount = 0;
      for (const result of converted.staffResults) {
        if (result.wish && !result.wish.isEmpty) {
          wishRepo.save(result.wish);
          savedCount++;
        }
      }

      const staffCount = converted.staffResults.length;
      const unknownCount = converted.staffResults.reduce(
        (sum, s) => sum + s.unknownSymbols.size,
        0,
      );
      const unmatchedNames = unmatchedResults.map((s) => s.name);

      // 未知の記号を集約（重複排除）
      const unknownSymbolSet = new Set<string>();
      for (const result of converted.staffResults) {
        for (const symbol of result.unknownSymbols.values()) {
          unknownSymbolSet.add(symbol);
        }
      }

      let summary = `${staffCount}名のスタッフを読み込み、${savedCount}名の希望を保存しました。`;
      if (unmatchedNames.length > 0) {
        summary += ` 臨時スタッフとして追加: ${unmatchedNames.join("、")}。`;
      }
      if (unknownCount > 0) {
        const symbols = [...unknownSymbolSet].map((s) => `「${s}」`).join(" ");
        summary += ` 未知の記号が${unknownCount}件あります: ${symbols}`;
      }

      setImportSummary(summary);
      setMessage({ kind: "info", text: "読み込み完了。希望をストアに保存しました。" });
    } catch (e) {
      setMessage({
        kind: "error",
        text: `読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setBusy(false);
    }
  }, [store, schedule, scheduleId, staffGroup, staffList, wishRepo]);

  const handleExport = useCallback(() => {
    if (!schedule) return;
    setBusy(true);
    setMessage(null);

    try {
      const days = schedule.workingDays();
      const dayMap = new Map(days.map((d: WorkingDay) => [d.key, d]));

      const periodWishes = (allWishes ?? [])
        .filter((w: StaffMonthlyShiftWish) => schedule.state.period.equals(w.state.period));
      const wishByStaff = new Map(
        periodWishes.map((w: StaffMonthlyShiftWish) => [w.state.staffId, w] as const),
      );

      const staffRows: StaffRow[] = staffList.map((s: Staff, i: number) => ({
        rowNumber: i + 1,
        subNumber: undefined,
        name: s.name,
        staffId: s.id,
      }));

      const confirmedDaysOff = new Map<string, Map<string, ConfirmedDayOffReason>>();

      const formatInput: FormatInput = {
        title: `${schedule.state.period.label}　シフト`,
        period: schedule.state.period,
        days,
        staffRows,
        shiftValueOf: (staffId: string, dayKey: string) => {
          const day = dayMap.get(dayKey);
          if (!day) return null;
          const a = schedule.getAssignment(staffId, day);
          return a?.shift ?? null;
        },
        wishesOf: (staffId: string, dayKey: string): Record<string, ShiftWishPreference> => {
          const w = wishByStaff.get(staffId);
          if (!w) return {};
          const day = days.find((d: { key: string }) => d.key === dayKey);
          return day ? w.wishesOn(day) : {};
        },
        dayOffReasonOf: (staffId, dayKey) =>
          confirmedDaysOff.get(staffId)?.get(dayKey),
      };

      downloadShiftExcel(formatInput);
      setMessage({ kind: "info", text: "Excelファイルをダウンロードしました。" });
    } catch (e) {
      setMessage({
        kind: "error",
        text: `エクスポートに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setBusy(false);
    }
  }, [schedule, staffList, allWishes]);

  return (
    <ShiftExcelView
      canImport={true}
      canExport={!!schedule}
      busy={busy}
      message={message}
      importSummary={importSummary}
      onImport={(file) => void handleImport(file)}
      onExport={handleExport}
      onDismissMessage={() => { setMessage(null); setImportSummary(null); }}
    />
  );
};
