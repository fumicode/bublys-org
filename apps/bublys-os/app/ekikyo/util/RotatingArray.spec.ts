//RotatingArraow.tsのjestテスト

import { RotatingArray } from "./RotatingArray";

describe("RotatingArray", () => {
  it("should rotate the array correctly", () => {
    const rotatingArray = new RotatingArray([1, 2, 3, 4, 5]);
    expect(rotatingArray.rotate(2).array).toEqual([3, 4, 5, 1, 2]);
    expect(rotatingArray.rotate(-2).array).toEqual([4, 5, 1, 2, 3]);
    expect(rotatingArray.rotate(5).array).toEqual([1, 2, 3, 4, 5]);
    expect(rotatingArray.rotate(0).array).toEqual([1, 2, 3, 4, 5]);
    expect(rotatingArray.rotate(7).array).toEqual([3, 4, 5, 1, 2]);
    expect(rotatingArray.rotate(-7).array).toEqual([4, 5, 1, 2, 3]);
    expect(rotatingArray.rotate(10).array).toEqual([1, 2, 3, 4, 5]);
    expect(rotatingArray.rotate(-10).array).toEqual([1, 2, 3, 4, 5]);
    expect(rotatingArray.rotate(12).array).toEqual([3, 4, 5, 1, 2]);
    expect(rotatingArray.rotate(-12).array).toEqual([4, 5, 1, 2, 3]);
    expect(rotatingArray.rotate(15).array).toEqual([1, 2, 3, 4, 5]);
    expect(rotatingArray.rotate(-15).array).toEqual([1, 2, 3, 4, 5]);
    expect(rotatingArray.rotate(17).array).toEqual([3, 4, 5, 1, 2]);
    expect(rotatingArray.rotate(-17).array).toEqual([4, 5, 1, 2, 3]);
  });
});
