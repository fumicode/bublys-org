import {
  MonthlyStaffSchedule,
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

  it("月末まで続く塊も置く", () => {
    const row = "-".repeat(27) + "OOO";
    const [mark] = runMarksOf(scheduleOf(row), "s1", days, 5);
    expect(mark).toMatchObject({ kind: "off", tone: "off-long", span: 3 });
    expect(mark.anchorDay.equals(day(30))).toBe(true);
  });
});
