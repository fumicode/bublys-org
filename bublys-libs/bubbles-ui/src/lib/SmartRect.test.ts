class DOMRect {
  constructor(public x: number, public y: number, public width: number, public height: number) {}
  get top() { return this.y; }
  get right() { return this.x + this.width; }
  get bottom() { return this.y + this.height; }
  get left() { return this.x; }
}
(global as any).DOMRect = DOMRect;

import { SmartRect } from "./SmartRect.js";
import { Size2 } from "./00_Point.js";

describe("SmartRect.merge", () => {
  const parentSize: Size2 = { width: 100, height: 100 };

  it("merges overlapping rectangles correctly", () => {
    const rectA = new SmartRect(new DOMRect(0, 0, 10, 10), parentSize);
    const rectB = new SmartRect(new DOMRect(5, 5, 10, 10), parentSize);
    const merged = rectA.merge(rectB);

    expect(merged.x).toBe(0);
    expect(merged.y).toBe(0);
    expect(merged.width).toBe(15);
    expect(merged.height).toBe(15);
    // parentSize should be inherited from the first
    expect(merged.parentSize).toEqual(parentSize);
  });

  it("merges non-overlapping rectangles correctly", () => {
    const rectA = new SmartRect(new DOMRect(0, 0, 10, 10), parentSize);
    const rectB = new SmartRect(new DOMRect(20, 20, 5, 5), parentSize);
    const merged = rectA.merge(rectB);

    expect(merged.x).toBe(0);
    expect(merged.y).toBe(0);
    expect(merged.width).toBe(25);
    expect(merged.height).toBe(25);
  });

  it("handles one rectangle fully inside another", () => {
    const rectOuter = new SmartRect(new DOMRect(0, 0, 30, 30), parentSize);
    const rectInner = new SmartRect(new DOMRect(5, 5, 10, 10), parentSize);
    const merged = rectOuter.merge(rectInner);

    // Should equal the outer rectangle
    expect(merged.x).toBe(rectOuter.x);
    expect(merged.y).toBe(rectOuter.y);
    expect(merged.width).toBe(rectOuter.width);
    expect(merged.height).toBe(rectOuter.height);
  });
});
