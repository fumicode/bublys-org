import {
  MonthlyStaffSchedule,
  PrecedingMonthTail,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { runMarksOf, type RunMark } from "./runMarkPlacement.js";

describe("runMarksOf — 連勤・連休の線の置き場所", () => {
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  // 表示中の日（6/1〜6/30）
  const days = Array.from({ length: 30 }, (_, i) => day(i + 1));

  /** "WWWO-W" のような文字列で 1日目から並べる（W=出勤 O=休み -=未定） */
  const scheduleOf = (row: string) => {
    let s = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    [...row].forEach((c, i) => {
      if (c === "W") s = s.assignShift("s1", day(i + 1), "early");
      if (c === "O") s = s.assignDayOff("s1", day(i + 1));
    });
    return s;
  };

  /** 線を「連勤は日ごとの色を / でつなぐ、連休は色」の文字列にする */
  const lineOf = (m: RunMark) =>
    m.kind === "work" ? m.dayTones.join("/") : m.tone;
  const lines = (row: string, max = 5) =>
    runMarksOf(scheduleOf(row), "s1", days, max).map(lineOf);

  it("連勤は何日目かで色が決まり、上限を超えた日から over（赤）が足される", () => {
    expect(lines("WWWO-WWWWO-WWWWWO-WWWWWWWO")).toEqual([
      "ok/ok/ok",
      "ok/ok/ok/near",
      "ok/ok/ok/near/limit",
      "ok/ok/ok/near/limit/over/over",
    ]);
  });

  it("休みの目標日数が入った人は、未定を出勤とみなして連勤に数える", () => {
    const row = "OOWW--WW";
    const shown = days.slice(0, row.length); // 9日以降も未定なので、表示を 6/1〜6/8 に絞る
    const at = (target?: number) =>
      runMarksOf(scheduleOf(row), "s1", shown, 5, target).map(lineOf);

    expect(at(2)).toEqual(["off-2", "ok/ok/ok/near/limit/over"]);
    // 目標に届いていなければ、未定はこれまでどおり塊を区切る
    expect(at(3)).toEqual(["off-2", "ok/ok", "ok/ok"]);
    expect(at(undefined)).toEqual(["off-2", "ok/ok", "ok/ok"]);
  });

  it("連休は 2連休・3連休以上で色を分け、1日だけの休みは線にしない", () => {
    expect(lines("O-OO-OOO")).toEqual(["off-2", "off-long"]);
  });

  it("未定は塊を区切る", () => {
    expect(lines("WW-WW")).toEqual(["ok/ok", "ok/ok"]);
  });

  it("上限が 4 なら、色も1日ずつ前にずれる", () => {
    expect(lines("WWWWO", 4)).toEqual(["ok/ok/near/limit"]);
  });

  it("線は塊の末尾のセルに置き、そこから左へ塊の長さぶん伸ばす", () => {
    const [mark] = runMarksOf(scheduleOf("-WWW"), "s1", days, 5);
    expect(mark).toMatchObject({ kind: "work", span: 3 });
    expect(mark.anchorDay.equals(day(4))).toBe(true);
  });

  describe("前月の末尾とつなぐ", () => {
    /** 前月（5月）の末尾を "OWWW" のような文字列で（最後が 5/31） */
    const tailOf = (row: string) => {
      let may = MonthlyStaffSchedule.create({ id: "may", storeId: "store-1", year: 2026, month: 5 });
      [...row].forEach((c, i) => {
        const d = WorkingDay.of(2026, 5, 31 - row.length + 1 + i);
        if (c === "W") may = may.assignShift("s1", d, "early");
        if (c === "O") may = may.assignDayOff("s1", d);
      });
      return PrecedingMonthTail.capture({
        sourceReportId: "may:1",
        schedule: may,
        shiftNameOf: () => "早番",
        length: row.length,
      });
    };
    const withTail = (tail: string, row: string) =>
      runMarksOf(scheduleOf(row).withPrecedingTail(tailOf(tail)), "s1", days, 5);

    it("前月末から続く連勤は、今月1日を何日目かで数え直さない（連勤制約と同じ）", () => {
      // 前月末 3連勤 ＋ 今月 3連勤 ＝ 6連勤。今月の側は 4・5・6日目
      expect(withTail("OWWW", "WWWO").map(lineOf)).toEqual(["ok/ok/ok", "near/limit/over"]);
    });

    it("月をまたぐ塊は、前月の列と今月の列それぞれの末尾に置く", () => {
      const [prev, cur] = withTail("OWWW", "WWWO");
      expect(prev.anchorDay.equals(WorkingDay.of(2026, 5, 31))).toBe(true);
      expect(prev).toMatchObject({ span: 3, length: 6 });
      expect(cur.anchorDay.equals(day(3))).toBe(true);
      expect(cur).toMatchObject({ span: 3, length: 6 });
    });

    it("前月末日の休みと今月1日の休みで 2連休", () => {
      expect(withTail("WWWWO", "OW").map(lineOf)).toEqual(["ok/ok/ok/near", "off-2", "off-2", "ok"]);
    });

    it("表示が今月1日から始まらないときは、前月とつながない", () => {
      const s = scheduleOf("WWWO").withPrecedingTail(tailOf("OWWW"));
      expect(runMarksOf(s, "s1", days.slice(1), 5).map(lineOf)).toEqual(["ok/ok"]);
    });
  });

  it("月末まで続く塊も置く", () => {
    const row = "-".repeat(27) + "OOO";
    const [mark] = runMarksOf(scheduleOf(row), "s1", days, 5);
    expect(mark).toMatchObject({ kind: "off", tone: "off-long", span: 3 });
    expect(mark.anchorDay.equals(day(30))).toBe(true);
  });
});
