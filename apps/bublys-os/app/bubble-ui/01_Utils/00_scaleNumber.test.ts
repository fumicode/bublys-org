import scaleNumber from "./00_scaleNumber";

describe("scaleNumber", () => {
  it("0〜1の範囲の数を、いろいろな範囲の数にマッピングできる", () => {
    expect(
      scaleNumber(0.5, { start: 0, end: 1 }, { start: 0, end: 100 })
    ).toEqual(50);
    expect(
      scaleNumber(0.5, { start: 0, end: 1 }, { start: 0, end: 10 })
    ).toEqual(5);
    expect(
      scaleNumber(0.25, { start: 0, end: 1 }, { start: 0, end: 100 })
    ).toEqual(25);
    expect(
      scaleNumber(0.75, { start: 0, end: 1 }, { start: 0, end: 100 })
    ).toEqual(75);
    expect(
      scaleNumber(0, { start: 0, end: 1 }, { start: 0, end: 100 })
    ).toEqual(0);
    expect(
      scaleNumber(1, { start: 0, end: 1 }, { start: 0, end: 100 })
    ).toEqual(100);
  });

  it("負の数も扱える", () => {
    expect(
      scaleNumber(-0.5, { start: -1, end: 1 }, { start: 0, end: 100 })
    ).toEqual(25);
    expect(
      scaleNumber(-0.5, { start: -1, end: 1 }, { start: 0, end: 10 })
    ).toEqual(2.5);
    expect(
      scaleNumber(-0.25, { start: -1, end: 1 }, { start: 0, end: 100 })
    ).toEqual(37.5);
    expect(
      scaleNumber(-0.75, { start: -1, end: 1 }, { start: 0, end: 100 })
    ).toEqual(12.5);
    expect(
      scaleNumber(-1, { start: -1, end: 1 }, { start: 0, end: 100 })
    ).toEqual(0);
    expect(
      scaleNumber(1, { start: -1, end: 1 }, { start: 0, end: 100 })
    ).toEqual(100);
  });

  it("いろんな範囲でも動く", () => {
    expect(
      scaleNumber(50, { start: 0, end: 100 }, { start: 0, end: 1 })
    ).toEqual(0.5);
    expect(scaleNumber(5, { start: 0, end: 10 }, { start: 0, end: 1 })).toEqual(
      0.5
    );
    expect(
      scaleNumber(25, { start: 0, end: 100 }, { start: 0, end: 0.5 })
    ).toEqual(0.125);
    expect(
      scaleNumber(75, { start: 0, end: 100 }, { start: 0, end: 0.5 })
    ).toEqual(0.25 + 0.125);
    expect(
      scaleNumber(0, { start: 0, end: 100 }, { start: -1, end: 1 })
    ).toEqual(-1);
    expect(
      scaleNumber(100, { start: 0, end: 100 }, { start: -1, end: 1 })
    ).toEqual(1);
  });
});
