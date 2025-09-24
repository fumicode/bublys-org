import zeroPadStr from "./01_zeroPadStr";

describe("zeroPadStr", () => {
  it("指定された桁でゼロ詰めできる", () => {
    expect(zeroPadStr(5, 3)).toBe("005");
    expect(zeroPadStr(42, 4)).toBe("0042");
    expect(zeroPadStr(123, 2)).toBe("123");
  });

  it("桁数がマイナスなら例外を投げる", () => {
    expect(() => zeroPadStr(123, -1)).toThrow(
      "桁数は正の整数でなければなりません。: -1"
    );
  });

  it("桁数が整数でなければ例外を投げる", () => {
    expect(() => zeroPadStr(123, 1.2)).toThrow(
      "桁数は正の整数でなければなりません。: 1.2"
    );
  });
});
