import { resolveShiftInput, suggestShiftInputs } from "./resolveShiftInput.js";
import { createDefaultWorkShifts } from "./WorkShift.js";

describe("resolveShiftInput", () => {
  const shifts = createDefaultWorkShifts(); // early 7:00 / middle 9:00 / late 13:00

  it("開始時刻の数字で勤務帯を解決する", () => {
    expect(resolveShiftInput("7", shifts)).toEqual({ kind: "work", shiftId: "early" });
    expect(resolveShiftInput("9", shifts)).toEqual({ kind: "work", shiftId: "middle" });
    expect(resolveShiftInput("13", shifts)).toEqual({ kind: "work", shiftId: "late" });
  });

  it("ローマ字別名で勤務帯を解決する（大文字小文字を無視）", () => {
    expect(resolveShiftInput("hayaban", shifts)).toEqual({ kind: "work", shiftId: "early" });
    expect(resolveShiftInput("NakaBan", shifts)).toEqual({ kind: "work", shiftId: "middle" });
    expect(resolveShiftInput("oso", shifts)).toEqual({ kind: "work", shiftId: "late" });
  });

  it("勤務帯ID・名前でも解決する", () => {
    expect(resolveShiftInput("early", shifts)).toEqual({ kind: "work", shiftId: "early" });
    expect(resolveShiftInput("早番", shifts)).toEqual({ kind: "work", shiftId: "early" });
  });

  it("休みの語は day-off に解決する", () => {
    expect(resolveShiftInput("yasumi", shifts)).toEqual({ kind: "day-off" });
    expect(resolveShiftInput("kyuu", shifts)).toEqual({ kind: "day-off" });
    expect(resolveShiftInput("休", shifts)).toEqual({ kind: "day-off" });
  });

  it("前後の空白を無視する", () => {
    expect(resolveShiftInput("  hayaban ", shifts)).toEqual({ kind: "work", shiftId: "early" });
  });

  it("該当しない入力は undefined を返す", () => {
    expect(resolveShiftInput("", shifts)).toBeUndefined();
    expect(resolveShiftInput("zzz", shifts)).toBeUndefined();
    expect(resolveShiftInput("8", shifts)).toBeUndefined(); // 8:00 開始の勤務帯は無い
  });
});

describe("suggestShiftInputs", () => {
  const shifts = createDefaultWorkShifts(); // early 7:00 / middle 9:00 / late 13:00

  const shiftIds = (raw: string) =>
    suggestShiftInputs(raw, shifts).map((s) => (s.kind === "work" ? s.shift.id : s.kind));

  it("空文字なら全候補（全勤務帯 + 休み + 未定）を返す", () => {
    expect(shiftIds("")).toEqual(["early", "middle", "late", "day-off", "undecided"]);
  });

  it("ローマ字の前方一致で絞る", () => {
    expect(shiftIds("na")).toEqual(["middle"]); // nakaban
    expect(shiftIds("hay")).toEqual(["early"]);
  });

  it("数字は開始時刻(時)の前方一致（'1' は 13時の遅番に当たる）", () => {
    expect(shiftIds("1")).toEqual(["late"]);
    expect(shiftIds("9")).toEqual(["middle"]);
  });

  it("休みの語の前方一致で休みを候補に含める", () => {
    expect(shiftIds("ya")).toEqual(["day-off"]); // yasumi
    expect(shiftIds("ky")).toEqual(["day-off"]); // kyuu
  });

  it("該当しなければ空", () => {
    expect(shiftIds("zzz")).toEqual([]);
  });
});
