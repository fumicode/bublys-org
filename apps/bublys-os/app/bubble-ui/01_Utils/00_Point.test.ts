import { Point2, Size2 } from "./00_Point";

describe("Point2", () => {
  it("xとyが正しくセットできる。", () => {
    const point: Point2 = { x: 1, y: 2 };
    expect(point.x).toBe(1);
    expect(point.y).toBe(2);
  });
});

describe("Size2", () => {
  it("widthとheightが正しくセットできる。", () => {
    const size: Size2 = { width: 1, height: 2 };
    expect(size.width).toBe(1);
    expect(size.height).toBe(2);
  });
});
