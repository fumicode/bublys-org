import {
  ConstraintDelta,
  computeConstraintDelta,
  violationIdentityKey,
} from "./ConstraintDelta.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { WorkingDay } from "./WorkingDay.js";

describe("computeConstraintDelta", () => {
  const day = WorkingDay.fromKey("2026-06-01");

  it("新規のスタッフ紐づき違反を concessions に入れる", () => {
    const before: ConstraintViolation[] = [];
    const after = [
      new ConstraintViolation({
        constraintType: "max-consecutive-workdays",
        staffId: "s1",
        days: [day],
        message: "6連勤（上限5連勤）",
      }),
    ];
    const delta = computeConstraintDelta(before, after);
    expect(delta.newlyViolated).toHaveLength(1);
    expect(delta.newlyResolved).toHaveLength(0);
    expect(delta.concessions).toHaveLength(1);
    expect(delta.concessions[0].staffId).toBe("s1");
  });

  it("日単位違反は newlyViolated には入るが concessions には入れない", () => {
    const after = [
      new ConstraintViolation({
        constraintType: "shift-leader",
        days: [day],
        message: "早責不足",
      }),
    ];
    const delta = computeConstraintDelta([], after);
    expect(delta.newlyViolated).toHaveLength(1);
    expect(delta.concessions).toHaveLength(0);
  });

  it("解消された違反を newlyResolved に入れる", () => {
    const before = [
      new ConstraintViolation({
        constraintType: "min-monthly-day-off",
        staffId: "s1",
        days: [],
        message: "休日不足",
      }),
    ];
    const delta = computeConstraintDelta(before, []);
    expect(delta.newlyResolved).toHaveLength(1);
    expect(delta.newlyViolated).toHaveLength(0);
  });

  it("同じ違反が前後どちらにもあれば、増えも減りもしない", () => {
    const violation = () =>
      new ConstraintViolation({
        constraintType: "min-monthly-day-off",
        staffId: "s1",
        days: [day],
        message: "休日不足",
      });
    const delta = computeConstraintDelta([violation()], [violation()]);
    expect(delta.newlyViolated).toHaveLength(0);
    expect(delta.newlyResolved).toHaveLength(0);
  });

  it("violationIdentityKey は違反から安定キーを返す（最初と最後の稼働日で挟む）", () => {
    const violation = new ConstraintViolation({
      constraintType: "x",
      staffId: "s",
      days: [WorkingDay.fromKey("2026-06-01"), WorkingDay.fromKey("2026-06-03")],
      message: "m",
    });
    expect(violationIdentityKey(violation)).toBe("x:s:2026-06-01_2026-06-03");
  });
});

describe("ConstraintDelta", () => {
  const day = WorkingDay.fromKey("2026-06-01");
  const violation = () =>
    new ConstraintViolation({
      constraintType: "max-consecutive-workdays",
      staffId: "s1",
      days: [day],
      message: "6連勤",
    });

  it("state は違反をインスタンスで持つ（保存形は toPlain で別に作る）", () => {
    const delta = ConstraintDelta.between([], [violation()]);

    expect(delta.state.newlyViolated[0]).toBeInstanceOf(ConstraintViolation);
    expect(delta.toPlain().newlyViolated[0]).toEqual({
      constraintType: "max-consecutive-workdays",
      staffId: "s1",
      dayKeys: ["2026-06-01"],
      message: "6連勤",
    });
  });

  it("toPlain / fromPlain で往復できる", () => {
    const original = ConstraintDelta.between([violation()], []);
    const restored = ConstraintDelta.fromPlain(
      JSON.parse(JSON.stringify(original.toPlain()))
    );

    expect(restored.newlyResolved[0]).toBeInstanceOf(ConstraintViolation);
    expect(restored.newlyResolved[0].message).toBe("6連勤");
    expect(restored.toPlain()).toEqual(original.toPlain());
  });

  it("empty は何も増減していない", () => {
    const delta = ConstraintDelta.empty();
    expect(delta.newlyViolated).toEqual([]);
    expect(delta.newlyResolved).toEqual([]);
    expect(delta.concessions).toEqual([]);
  });
});
