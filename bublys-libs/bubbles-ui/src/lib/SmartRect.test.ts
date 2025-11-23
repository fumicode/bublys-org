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

  it("重なっている矩形を正しくマージする", () => {
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

  it("離れている矩形を正しくマージする", () => {
    const rectA = new SmartRect(new DOMRect(0, 0, 10, 10), parentSize);
    const rectB = new SmartRect(new DOMRect(20, 20, 5, 5), parentSize);
    const merged = rectA.merge(rectB);

    expect(merged.x).toBe(0);
    expect(merged.y).toBe(0);
    expect(merged.width).toBe(25);
    expect(merged.height).toBe(25);
  });

  it("一方の矩形が他方に完全に含まれる場合を正しく処理する", () => {
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

describe("SmartRect.getNeighbor", () => {
  const parentSize: Size2 = { width: 1000, height: 800 };
  // 中心のSmartRect: x=100, y=100, width=50, height=50
  let centerRect: SmartRect;

  beforeEach(() => {
    centerRect = new SmartRect(new DOMRect(100, 100, 50, 50), parentSize);
  });

  it("上隣[2]を正しく生成する（画面上端から中心上端まで）", () => {
    const top = centerRect.getNeighbor("top");
    expect(top.x).toBe(100); // 中心のx
    expect(top.y).toBe(0); // 画面の上端
    expect(top.width).toBe(50); // 中心の幅
    expect(top.height).toBe(100); // 画面上端から中心上端まで
  });

  it("右隣[6]を正しく生成する（中心右端から画面右端まで）", () => {
    const right = centerRect.getNeighbor("right");
    expect(right.x).toBe(150); // 中心の右端
    expect(right.y).toBe(100); // 中心のy
    expect(right.width).toBe(850); // 中心右端から画面右端まで (1000-150)
    expect(right.height).toBe(50); // 中心の高さ
  });

  it("下隣[8]を正しく生成する（中心下端から画面下端まで）", () => {
    const bottom = centerRect.getNeighbor("bottom");
    expect(bottom.x).toBe(100); // 中心のx
    expect(bottom.y).toBe(150); // 中心の下端
    expect(bottom.width).toBe(50); // 中心の幅
    expect(bottom.height).toBe(650); // 中心下端から画面下端まで (800-150)
  });

  it("左隣[4]を正しく生成する（画面左端から中心左端まで）", () => {
    const left = centerRect.getNeighbor("left");
    expect(left.x).toBe(0); // 画面の左端
    expect(left.y).toBe(100); // 中心のy
    expect(left.width).toBe(100); // 画面左端から中心左端まで
    expect(left.height).toBe(50); // 中心の高さ
  });
});

describe("SmartRect.getCorner", () => {
  const parentSize: Size2 = { width: 1000, height: 800 };
  let centerRect: SmartRect;

  beforeEach(() => {
    centerRect = new SmartRect(new DOMRect(100, 100, 50, 50), parentSize);
  });

  it("左上角[1]を正しく生成する（画面の左上角領域）", () => {
    const topLeft = centerRect.getCorner("topLeft");
    expect(topLeft.x).toBe(0); // 画面の左端
    expect(topLeft.y).toBe(0); // 画面の上端
    expect(topLeft.width).toBe(100); // 画面左端から中心左端まで
    expect(topLeft.height).toBe(100); // 画面上端から中心上端まで
  });

  it("右上角[3]を正しく生成する（画面の右上角領域）", () => {
    const topRight = centerRect.getCorner("topRight");
    expect(topRight.x).toBe(150); // 中心の右端
    expect(topRight.y).toBe(0); // 画面の上端
    expect(topRight.width).toBe(850); // 中心右端から画面右端まで (1000-150)
    expect(topRight.height).toBe(100); // 画面上端から中心上端まで
  });

  it("左下角[7]を正しく生成する（画面の左下角領域）", () => {
    const bottomLeft = centerRect.getCorner("bottomLeft");
    expect(bottomLeft.x).toBe(0); // 画面の左端
    expect(bottomLeft.y).toBe(150); // 中心の下端
    expect(bottomLeft.width).toBe(100); // 画面左端から中心左端まで
    expect(bottomLeft.height).toBe(650); // 中心下端から画面下端まで (800-150)
  });

  it("右下角[9]を正しく生成する（画面の右下角領域）", () => {
    const bottomRight = centerRect.getCorner("bottomRight");
    expect(bottomRight.x).toBe(150); // 中心の右端
    expect(bottomRight.y).toBe(150); // 中心の下端
    expect(bottomRight.width).toBe(850); // 中心右端から画面右端まで (1000-150)
    expect(bottomRight.height).toBe(650); // 中心下端から画面下端まで (800-150)
  });
});

describe("SmartRect.getSide", () => {
  const parentSize: Size2 = { width: 1000, height: 800 };
  let centerRect: SmartRect;

  beforeEach(() => {
    centerRect = new SmartRect(new DOMRect(100, 100, 50, 50), parentSize);
  });

  it("上側[1][2][3]を合成して正しく生成する（画面上端全体）", () => {
    const topSide = centerRect.getSide("top");
    // [1][2][3]を合成した領域 - 画面の上端全体
    expect(topSide.x).toBe(0); // 画面の左端
    expect(topSide.y).toBe(0); // 画面の上端
    expect(topSide.width).toBe(1000); // 画面全幅
    expect(topSide.height).toBe(100); // 画面上端から中心上端まで
  });

  it("右側[3][6][9]を合成して正しく生成する（画面右端全体）", () => {
    const rightSide = centerRect.getSide("right");
    // [3][6][9]を合成した領域 - 画面の右端全体
    expect(rightSide.x).toBe(150); // 中心の右端
    expect(rightSide.y).toBe(0); // 画面の上端
    expect(rightSide.width).toBe(850); // 中心右端から画面右端まで (1000-150)
    expect(rightSide.height).toBe(800); // 画面全高
  });

  it("下側[7][8][9]を合成して正しく生成する（画面下端全体）", () => {
    const bottomSide = centerRect.getSide("bottom");
    // [7][8][9]を合成した領域 - 画面の下端全体
    expect(bottomSide.x).toBe(0); // 画面の左端
    expect(bottomSide.y).toBe(150); // 中心の下端
    expect(bottomSide.width).toBe(1000); // 画面全幅
    expect(bottomSide.height).toBe(650); // 中心下端から画面下端まで (800-150)
  });

  it("左側[1][4][7]を合成して正しく生成する（画面左端全体）", () => {
    const leftSide = centerRect.getSide("left");
    // [1][4][7]を合成した領域 - 画面の左端全体
    expect(leftSide.x).toBe(0); // 画面の左端
    expect(leftSide.y).toBe(0); // 画面の上端
    expect(leftSide.width).toBe(100); // 画面左端から中心左端まで
    expect(leftSide.height).toBe(800); // 画面全高
  });
});

describe("SmartRect.getAllSurrounding", () => {
  const parentSize: Size2 = { width: 1000, height: 800 };
  let centerRect: SmartRect;

  beforeEach(() => {
    centerRect = new SmartRect(new DOMRect(100, 100, 50, 50), parentSize);
  });

  it("周囲8つのSmartRectを正しい順序で返す", () => {
    const surrounding = centerRect.getAllSurrounding();
    expect(surrounding.length).toBe(8);

    // [1] topLeft - 画面の左上角領域
    expect(surrounding[0].x).toBe(0);
    expect(surrounding[0].y).toBe(0);
    expect(surrounding[0].width).toBe(100);
    expect(surrounding[0].height).toBe(100);

    // [2] top - 画面の上端領域
    expect(surrounding[1].x).toBe(100);
    expect(surrounding[1].y).toBe(0);
    expect(surrounding[1].width).toBe(50);
    expect(surrounding[1].height).toBe(100);

    // [3] topRight - 画面の右上角領域
    expect(surrounding[2].x).toBe(150);
    expect(surrounding[2].y).toBe(0);
    expect(surrounding[2].width).toBe(850);
    expect(surrounding[2].height).toBe(100);

    // [4] left - 画面の左端領域
    expect(surrounding[3].x).toBe(0);
    expect(surrounding[3].y).toBe(100);
    expect(surrounding[3].width).toBe(100);
    expect(surrounding[3].height).toBe(50);

    // [6] right - 画面の右端領域
    expect(surrounding[4].x).toBe(150);
    expect(surrounding[4].y).toBe(100);
    expect(surrounding[4].width).toBe(850);
    expect(surrounding[4].height).toBe(50);

    // [7] bottomLeft - 画面の左下角領域
    expect(surrounding[5].x).toBe(0);
    expect(surrounding[5].y).toBe(150);
    expect(surrounding[5].width).toBe(100);
    expect(surrounding[5].height).toBe(650);

    // [8] bottom - 画面の下端領域
    expect(surrounding[6].x).toBe(100);
    expect(surrounding[6].y).toBe(150);
    expect(surrounding[6].width).toBe(50);
    expect(surrounding[6].height).toBe(650);

    // [9] bottomRight - 画面の右下角領域
    expect(surrounding[7].x).toBe(150);
    expect(surrounding[7].y).toBe(150);
    expect(surrounding[7].width).toBe(850);
    expect(surrounding[7].height).toBe(650);
  });
});

describe("SmartRect.getAllCorners", () => {
  const parentSize: Size2 = { width: 1000, height: 800 };
  let centerRect: SmartRect;

  beforeEach(() => {
    centerRect = new SmartRect(new DOMRect(100, 100, 50, 50), parentSize);
  });

  it("角4つのSmartRectを正しい順序で返す", () => {
    const corners = centerRect.getAllCorners();
    expect(corners.length).toBe(4);

    // [1] topLeft - 画面の左上角領域
    expect(corners[0].x).toBe(0);
    expect(corners[0].y).toBe(0);
    expect(corners[0].width).toBe(100);
    expect(corners[0].height).toBe(100);

    // [3] topRight - 画面の右上角領域
    expect(corners[1].x).toBe(150);
    expect(corners[1].y).toBe(0);
    expect(corners[1].width).toBe(850);
    expect(corners[1].height).toBe(100);

    // [7] bottomLeft - 画面の左下角領域
    expect(corners[2].x).toBe(0);
    expect(corners[2].y).toBe(150);
    expect(corners[2].width).toBe(100);
    expect(corners[2].height).toBe(650);

    // [9] bottomRight - 画面の右下角領域
    expect(corners[3].x).toBe(150);
    expect(corners[3].y).toBe(150);
    expect(corners[3].width).toBe(850);
    expect(corners[3].height).toBe(650);
  });
});

describe("SmartRect.getAllNeighbors", () => {
  const parentSize: Size2 = { width: 1000, height: 800 };
  let centerRect: SmartRect;

  beforeEach(() => {
    centerRect = new SmartRect(new DOMRect(100, 100, 50, 50), parentSize);
  });

  it("隣接4つのSmartRectを正しい順序で返す", () => {
    const neighbors = centerRect.getAllNeighbors();
    expect(neighbors.length).toBe(4);

    // [2] top - 画面の上端領域
    expect(neighbors[0].x).toBe(100);
    expect(neighbors[0].y).toBe(0);
    expect(neighbors[0].width).toBe(50);
    expect(neighbors[0].height).toBe(100);

    // [4] left - 画面の左端領域
    expect(neighbors[1].x).toBe(0);
    expect(neighbors[1].y).toBe(100);
    expect(neighbors[1].width).toBe(100);
    expect(neighbors[1].height).toBe(50);

    // [6] right - 画面の右端領域
    expect(neighbors[2].x).toBe(150);
    expect(neighbors[2].y).toBe(100);
    expect(neighbors[2].width).toBe(850);
    expect(neighbors[2].height).toBe(50);

    // [8] bottom - 画面の下端領域
    expect(neighbors[3].x).toBe(100);
    expect(neighbors[3].y).toBe(150);
    expect(neighbors[3].width).toBe(50);
    expect(neighbors[3].height).toBe(650);
  });
});
