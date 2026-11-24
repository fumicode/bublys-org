'use client';

import { FC, useCallback, useMemo, useRef, useState } from "react";
import {
  WorkingDay,
  MonthlyStaffSchedule,
  Staff,
  StaffMonthlyShiftWish,
  WorkingStaffGroup,
  WorkShiftSet,
  GOVERNMENT_SYMBOL_MAPPING,
  legendToShiftIds,
  toWareki,
  type ShiftWishPreference,
  type ShiftCell,
  type StaffRow,
  type FormatInput,
} from "@bublys-org/hotel-shift-puzzle-model";
import { recordSetCells } from "./recordScheduleEdit.js";
import { useAppStore } from "@bublys-org/state-management";
import {
  useObject,
  useObjectRepo,
  useObjects,
} from "../objects/repository.js";
import { ShiftExcelView } from "../ui/ShiftExcelView.js";
import { importShiftFromExcel } from "./shiftExcelImport.js";
import { downloadShiftExcel } from "./shiftExcelExport.js";
import { downloadShiftFromTemplate } from "./shiftTemplateExport.js";
import { saveTemplate, loadTemplate } from "./shiftTemplateStorage.js";
import { rokuyoNoteOf } from "./rokuyoNote.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { useStore } from "./useStore.js";
import { recordMembershipEdit } from "./recordScheduleEdit.js";
import {
  SCHEDULE_TYPE,
  STAFF_TYPE,
  WORKING_STAFF_GROUP_TYPE,
  STAFF_SHIFT_WISH_TYPE,
  WORKSHIFT_SET_TYPE,
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
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const resolvedStore = useStore(schedule?.storeId);
  const isGovernment = resolvedStore?.format.id === "government";

  const staffList = useMemo(
    () => (staffGroup ? staffGroup.resolve(roster) : roster),
    [staffGroup, roster],
  );

  const wishRepo = useObjectRepo<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "warn" | "error"; text: string } | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [templateUpdatePrompt, setTemplateUpdatePrompt] = useState(false);
  const pendingTemplateBuffer = useRef<ArrayBuffer | null>(null);

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

      // 期間の不一致チェック
      const periodMismatch = converted.period != null
        && !schedule.state.period.equals(converted.period);

      // 名簿にないスタッフを臨時の人として WorkingStaffGroup に追加
      const unmatchedResults = converted.staffResults
        .filter((s) => !staffByName.has(s.name));

      if (staffGroup) {
        let updatedGroup = staffGroup;

        // 未登録スタッフを臨時メンバーとして追加
        for (const result of unmatchedResults) {
          const staffId = `imported-${result.name}`;
          if (!updatedGroup.has(staffId)) {
            const tempStaff = new Staff({ id: staffId, name: result.name });
            updatedGroup = updatedGroup.addTemporary(tempStaff);
          }
        }

        // サブ番号を反映
        for (const result of converted.staffResults) {
          const staffId = staffByName.get(result.name) ?? `imported-${result.name}`;
          if (updatedGroup.has(staffId)) {
            updatedGroup = updatedGroup.setSubNumber(staffId, result.subNumber);
          }
        }

        // 凡例から可能勤務帯を反映（2セクション: 正規職員 / 会計年度任用）
        if (converted.legendSections.length >= 2 && workShiftSet) {
          const regularShiftIds = legendToShiftIds(
            converted.legendSections[0], GOVERNMENT_SYMBOL_MAPPING, workShiftSet,
          );
          const fiscalShiftIds = legendToShiftIds(
            converted.legendSections[1], GOVERNMENT_SYMBOL_MAPPING, workShiftSet,
          );
          if (regularShiftIds.length > 0 || fiscalShiftIds.length > 0) {
            for (const result of converted.staffResults) {
              const staffId = staffByName.get(result.name) ?? `imported-${result.name}`;
              if (!updatedGroup.has(staffId)) continue;
              const ids = result.subNumber !== undefined ? fiscalShiftIds : regularShiftIds;
              if (ids.length > 0) {
                updatedGroup = updatedGroup.setAllowedShifts(staffId, ids);
              }
            }
          }
        }

        // 凡例にない勤務帯を WorkShiftSet から削除
        let updatedShiftSet = workShiftSet;
        if (converted.legendSections.length >= 2 && updatedShiftSet) {
          const allLegendShiftIds = new Set([
            ...legendToShiftIds(converted.legendSections[0], GOVERNMENT_SYMBOL_MAPPING, updatedShiftSet),
            ...legendToShiftIds(converted.legendSections[1], GOVERNMENT_SYMBOL_MAPPING, updatedShiftSet),
          ]);
          if (allLegendShiftIds.size > 0) {
            for (const shift of updatedShiftSet.shifts) {
              if (!allLegendShiftIds.has(shift.id)) {
                updatedShiftSet = updatedShiftSet.remove(shift.id);
              }
            }
          }
        }

        const changed: { type: string; obj: unknown }[] = [];
        if (updatedGroup !== staffGroup) {
          changed.push({ type: WORKING_STAFF_GROUP_TYPE, obj: updatedGroup });
        }
        if (updatedShiftSet && updatedShiftSet !== workShiftSet) {
          changed.push({ type: WORKSHIFT_SET_TYPE, obj: updatedShiftSet });
        }
        if (changed.length > 0) {
          recordMembershipEdit(store, {
            scheduleId,
            schedule,
            changed,
          });
        }
      }

      let savedCount = 0;
      let dayOffChanges: { staffId: string; day: WorkingDay; to: ShiftCell }[] = [];

      if (!periodMismatch) {
        // 確定休み（休暇・週休・祝日）を勤務表のセルに書き込む
        const dayMap = new Map(schedule.workingDays().map((d) => [d.key, d]));
        const REASON_SHORT: Record<string, string> = { "": "休", weekly: "週", holiday: "祝" };
        for (const result of converted.staffResults) {
          const staffId = staffByName.get(result.name) ?? `imported-${result.name}`;
          for (const [dayKey, reason] of result.confirmedDaysOff) {
            const day = dayMap.get(dayKey);
            if (day) {
              dayOffChanges.push({
                staffId,
                day,
                to: { kind: "day-off", reason: REASON_SHORT[reason] ?? reason },
              });
            }
          }
        }
        let updatedSchedule = schedule;
        if (dayOffChanges.length > 0) {
          updatedSchedule = recordSetCells(store, {
            schedule: updatedSchedule,
            changes: dayOffChanges,
          });
        }

        // 希望を保存（external なので世界線とは別に保存）
        for (const result of converted.staffResults) {
          if (result.wish && !result.wish.isEmpty) {
            wishRepo.save(result.wish);
            savedCount++;
          }
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

      let summary: string;
      if (periodMismatch) {
        summary = `⚠ Excelの期間（${converted.period!.label}）が勤務表の期間（${schedule.state.period.label}）と異なります。`
          + ` ${staffCount}名のスタッフのみ読み込みました。希望・確定休みは反映されません。`;
      } else {
        summary = `${staffCount}名のスタッフを読み込み、${savedCount}名の希望を保存しました。`;
        if (dayOffChanges.length > 0) {
          summary += ` 確定休み${dayOffChanges.length}件を反映しました。`;
        }
      }
      if (unmatchedNames.length > 0) {
        summary += ` 臨時スタッフとして追加: ${unmatchedNames.join("、")}。`;
      }
      if (unknownCount > 0) {
        const symbols = [...unknownSymbolSet].map((s) => `「${s}」`).join(" ");
        summary += ` 未知の記号が${unknownCount}件あります: ${symbols}`;
      }

      setImportSummary(summary);
      const msgText = periodMismatch
        ? "期間が異なるため、スタッフのみ読み込みました。"
        : "読み込み完了。希望をストアに保存しました。";
      setMessage({ kind: periodMismatch ? "warn" : "info", text: msgText });

      if (isGovernment) {
        pendingTemplateBuffer.current = buffer;
        setTemplateUpdatePrompt(true);
      }
    } catch (e) {
      setMessage({
        kind: "error",
        text: `読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setBusy(false);
    }
  }, [store, schedule, scheduleId, staffGroup, staffList, wishRepo, isGovernment, workShiftSet]);

  const handleConfirmTemplateUpdate = useCallback(() => {
    if (pendingTemplateBuffer.current) {
      saveTemplate("government", pendingTemplateBuffer.current);
      setMessage({ kind: "info", text: "テンプレートを保存しました。" });
    }
    pendingTemplateBuffer.current = null;
    setTemplateUpdatePrompt(false);
  }, []);

  const handleSkipTemplateUpdate = useCallback(() => {
    pendingTemplateBuffer.current = null;
    setTemplateUpdatePrompt(false);
  }, []);

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
        subNumber: staffGroup?.memberOf(s.id)?.subNumber,
        name: s.name,
        staffId: s.id,
      }));

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
        dayOffReasonOf: (staffId: string, dayKey: string) => {
          const day = dayMap.get(dayKey);
          if (!day) return undefined;
          return schedule.getAssignment(staffId, day)?.dayOffReason;
        },
        shiftNameOf: (shiftId: string) =>
          workShiftSet?.shifts.find((s) => s.id === shiftId)?.name,
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
  }, [schedule, staffList, allWishes, workShiftSet]);

  const handleTemplateExport = useCallback(() => {
    if (!schedule) return;
    setBusy(true);
    setMessage(null);

    try {
      const days = schedule.workingDays();
      const dayMap = new Map(days.map((d: WorkingDay) => [d.key, d]));

      const staffRows: StaffRow[] = staffList.map((s: Staff, i: number) => ({
        rowNumber: i + 1,
        subNumber: staffGroup?.memberOf(s.id)?.subNumber,
        name: s.name,
        staffId: s.id,
      }));

      const storeName = resolvedStore?.name ?? "シフト";
      const startDay = days[0];
      const endDay = days[days.length - 1];
      const title = startDay && endDay
        ? `${toWareki(startDay)}～${toWareki(endDay)}　${storeName}シフト`
        : `${schedule.state.period.label}　${storeName}シフト`;

      const formatInput: FormatInput = {
        title,
        period: schedule.state.period,
        days,
        staffRows,
        shiftValueOf: (staffId: string, dayKey: string) => {
          const day = dayMap.get(dayKey);
          if (!day) return null;
          const a = schedule.getAssignment(staffId, day);
          return a?.shift ?? null;
        },
        dayOffReasonOf: (staffId: string, dayKey: string) => {
          const day = dayMap.get(dayKey);
          if (!day) return undefined;
          return schedule.getAssignment(staffId, day)?.dayOffReason;
        },
        shiftNameOf: (shiftId: string) =>
          workShiftSet?.shifts.find((s) => s.id === shiftId)?.name,
      };

      const storedTemplate = loadTemplate("government");
      downloadShiftFromTemplate(formatInput, {
        rokuyoOf: (day) => {
          const note = rokuyoNoteOf(day);
          return note ? { label: note.label } : undefined;
        },
        templateData: storedTemplate,
      });
      setMessage({ kind: "info", text: "集計付きテンプレートExcelをダウンロードしました。" });
    } catch (e) {
      setMessage({
        kind: "error",
        text: `テンプレートエクスポートに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setBusy(false);
    }
  }, [schedule, staffList, staffGroup, workShiftSet, resolvedStore]);

  return (
    <ShiftExcelView
      canImport={true}
      canExport={!!schedule}
      canTemplateExport={isGovernment}
      busy={busy}
      message={message}
      importSummary={importSummary}
      templateUpdatePrompt={templateUpdatePrompt}
      onImport={(file) => void handleImport(file)}
      onExport={handleExport}
      onTemplateExport={handleTemplateExport}
      onDismissMessage={() => { setMessage(null); setImportSummary(null); }}
      onConfirmTemplateUpdate={handleConfirmTemplateUpdate}
      onSkipTemplateUpdate={handleSkipTemplateUpdate}
    />
  );
};
