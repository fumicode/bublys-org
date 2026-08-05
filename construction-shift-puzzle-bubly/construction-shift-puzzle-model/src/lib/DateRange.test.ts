import { DateRange } from "./DateRange.js";
import { WorkingDay } from "./WorkingDay.js";

const d = (n: number) => WorkingDay.of(2026, 8, n);

describe("DateRange", () => {
  it("of は from<=to に正規化する", () => {
    const r = DateRange.of(d(5), d(2));
    expect(r.from.key).toBe("2026-08-02");
    expect(r.to.key).toBe("2026-08-05");
  });

  it("days / lengthDays（両端含む）", () => {
    const r = DateRange.of(d(2), d(4));
    expect(r.days().map((x) => x.key)).toEqual(["2026-08-02", "2026-08-03", "2026-08-04"]);
    expect(r.lengthDays).toBe(3);
  });

  it("contains", () => {
    const r = DateRange.of(d(2), d(4));
    expect(r.contains(d(2))).toBe(true);
    expect(r.contains(d(4))).toBe(true);
    expect(r.contains(d(5))).toBe(false);
  });

  it("overlaps", () => {
    expect(DateRange.of(d(2), d(4)).overlaps(DateRange.of(d(4), d(6)))).toBe(true);
    expect(DateRange.of(d(2), d(4)).overlaps(DateRange.of(d(5), d(6)))).toBe(false);
  });

  it("covers", () => {
    expect(DateRange.of(d(1), d(7)).covers(DateRange.of(d(3), d(4)))).toBe(true);
    expect(DateRange.of(d(3), d(4)).covers(DateRange.of(d(1), d(7)))).toBe(false);
  });

  it("toPlain / fromPlain", () => {
    const r = DateRange.of(d(2), d(5));
    expect(DateRange.fromPlain(r.toPlain()).equals(r)).toBe(true);
  });
});
