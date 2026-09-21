import {
  cellsToText,
  copyCell,
  describeSkipped,
  parseClipboardText,
  planObjectPaste,
  planValuePaste,
  type CellPaste,
} from "./cellClipboard.js";
import type { ShiftCell } from "./MonthlyStaffSchedule.js";
import { WorkShift, createDefaultWorkShifts } from "./WorkShift.js";
import { WorkingDay } from "./WorkingDay.js";
import { WorkingStaffGroup } from "../staff/WorkingStaffGroup.js";
import { WorkingStaffMember } from "../staff/WorkingStaffMember.js";

/**
 * セルのコピー・貼り付け（#166）。
 * 値のみ＝見えている文字を位置で貼る。オブジェクトとして＝中身を人と日で貼る。
 */
describe("cellClipboard（勤務表のセルのコピー・貼り付け）", () => {
  const shifts = createDefaultWorkShifts(); // early 7:00 / middle 9:00 / late 13:00
  const days = [1, 2, 3, 4].map((d) => WorkingDay.of(2026, 6, d));
  const staffIds = ["s1", "s2", "s3"];
  const early: ShiftCell = { kind: "work", shiftId: "early" };
  const late: ShiftCell = { kind: "work", shiftId: "late" };
  const off: ShiftCell = { kind: "day-off" };
  const undecided: ShiftCell = { kind: "undecided" };
  const at = (staffId: string, d: number) => ({ staffId, day: days[d - 1] });
  /** 変更を「s2:1=early」の形で並べる */
  const labels = (changes: CellPaste[]) =>
    changes.map(
      (c) => `${c.staffId}:${c.day.day}=${c.to.kind === "work" ? c.to.shiftId : c.to.kind}`
    );

  describe("値のみ（位置で貼る）", () => {
    it("★ コピーした文字を別の人の行へ貼ると、同じパターンが写る", () => {
      const text = cellsToText([[early, off, late]], shifts);
      expect(text).toBe("7\t休\t13");

      const plan = planValuePaste({
        grid: parseClipboardText(text),
        targets: [at("s2", 1)],
        staffIds,
        days,
        shifts,
      });

      expect(labels(plan.changes)).toEqual(["s2:1=early", "s2:2=day-off", "s2:3=late"]);
      expect(describeSkipped(plan.skipped)).toBeUndefined();
    });

    it("★ 値が1つなら選択の全セルへ入れる", () => {
      const plan = planValuePaste({
        grid: parseClipboardText("休"),
        targets: [at("s1", 2), at("s1", 3), at("s2", 2), at("s2", 3)],
        staffIds,
        days,
        shifts,
      });

      expect(labels(plan.changes)).toEqual([
        "s1:2=day-off",
        "s1:3=day-off",
        "s2:2=day-off",
        "s2:3=day-off",
      ]);
    });

    it("★ 表は選択の左上から貼り、表の外にはみ出した分は数える", () => {
      const plan = planValuePaste({
        grid: parseClipboardText("7\t9\n13\t休"),
        targets: [at("s3", 4)],
        staffIds,
        days,
        shifts,
      });

      expect(labels(plan.changes)).toEqual(["s3:4=early"]);
      expect(plan.skipped["out-of-grid"]).toBe(3);
    });

    it("Excel の文字（\\r\\n・末尾の改行）を読める。空は未定、読めない文字は数える", () => {
      const grid = parseClipboardText("7\t\r\nzzz\t休\r\n");
      expect(grid).toEqual([["7", ""], ["zzz", "休"]]);

      const plan = planValuePaste({ grid, targets: [at("s1", 1)], staffIds, days, shifts });

      expect(labels(plan.changes)).toEqual(["s1:1=early", "s1:2=undecided", "s2:2=day-off"]);
      expect(plan.skipped.unreadable).toBe(1);
    });

    it("可能勤務帯に無い値はその人のセルだけ貼らない（休み・未定は誰にでも入る）", () => {
      const staffGroup = new WorkingStaffGroup({
        id: "g",
        members: [
          WorkingStaffMember.ofRoster("s1"),
          new WorkingStaffMember({ staffId: "s2", allowedShiftIds: ["late"] }),
          WorkingStaffMember.ofRoster("s3"),
        ],
      });

      const plan = planValuePaste({
        grid: parseClipboardText("7\n7\n休"),
        targets: [at("s1", 1)],
        staffIds,
        days,
        shifts,
        staffGroup,
      });

      expect(labels(plan.changes)).toEqual(["s1:1=early", "s3:1=day-off"]);
      expect(plan.skipped["not-allowed"]).toBe(1);
    });
  });

  describe("オブジェクトとして（人と日で貼る）", () => {
    it("★ 選択に関係なく、コピー元と同じ人・同じ日に貼る。居ない人・無い日は数える", () => {
      const copied = [
        copyCell("s1", days[0], early, shifts),
        copyCell("s2", days[1], off, shifts),
        copyCell("gone", days[0], early, shifts),
        copyCell("s3", WorkingDay.of(2026, 7, 1), late, shifts),
      ];

      const plan = planObjectPaste({ copied, staffIds, days, shifts });

      expect(labels(plan.changes)).toEqual(["s1:1=early", "s2:2=day-off"]);
      expect(plan.skipped["no-staff"]).toBe(1);
      expect(plan.skipped["no-day"]).toBe(1);
    });

    it("勤務帯は ID で合わせ、ID が無ければ名前で合わせる。どちらも無ければ貼らない", () => {
      // 貼り付け先の勤務表は勤務帯セットを作り直していて、早番の ID が違う。夜勤は無い
      const otherShifts = [
        WorkShift.of("early-2", "早番", { hour: 7 }),
        WorkShift.of("late", "遅番", { hour: 13 }),
      ];
      const night = WorkShift.of("night", "夜勤", { hour: 22 });
      const copied = [
        copyCell("s1", days[0], early, shifts), // ID 無し → 名前「早番」で
        copyCell("s1", days[1], late, shifts), // ID で
        copyCell("s1", days[2], { kind: "work", shiftId: "night" }, [night]), // どちらも無い
        copyCell("s1", days[3], undecided, shifts),
      ];

      const plan = planObjectPaste({ copied, staffIds, days, shifts: otherShifts });

      expect(labels(plan.changes)).toEqual(["s1:1=early-2", "s1:2=late", "s1:4=undecided"]);
      expect(plan.skipped["no-shift"]).toBe(1);
    });

    it("貼り付け先の可能勤務帯に無い値は貼らない", () => {
      const staffGroup = new WorkingStaffGroup({
        id: "g",
        members: [new WorkingStaffMember({ staffId: "s1", allowedShiftIds: ["late"] })],
      });

      const plan = planObjectPaste({
        copied: [copyCell("s1", days[0], early, shifts), copyCell("s1", days[1], off, shifts)],
        staffIds,
        days,
        shifts,
        staffGroup,
      });

      expect(labels(plan.changes)).toEqual(["s1:2=day-off"]);
      expect(plan.skipped["not-allowed"]).toBe(1);
    });
  });

  it("貼れなかった件数を、理由ごとに知らせる", () => {
    expect(
      describeSkipped({
        "no-staff": 2,
        "no-day": 0,
        "no-shift": 0,
        "not-allowed": 1,
        unreadable: 0,
        "out-of-grid": 0,
      })
    ).toBe("3件貼れませんでした（表に居ない人 2・可能勤務帯に無い 1）");
  });
});
