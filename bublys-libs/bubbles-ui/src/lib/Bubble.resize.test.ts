import { Layer } from "@bublys-org/bubbles-ui-util";
import { Bubble } from "./Bubble.domain";

const MIN = { width: 160, height: 100 };

const makeBubble = (position: { x: number; y: number }, size: { width: number; height: number }) =>
  new Bubble({ url: "test", position, size, params: {} } as ConstructorParameters<typeof Bubble>[0]);

/** 奥行き 0（等倍）・原点オフセット (100,100) の面 */
const surface = new Layer(0, { x: 100, y: 100 }, { x: 640, y: 360 });
/** 奥行き 2（縮小あり）の面 */
const deep = new Layer(2, { x: 100, y: 100 }, { x: 640, y: 360 });

describe("Bubble.resizeByEdge — 掴んだ辺の反対側が固定される", () => {
  const bubble = makeBubble({ x: 0, y: 0 }, { width: 400, height: 300 });
  const rightEdge = (b: Bubble) => b.position.x + (b.size?.width ?? 0);

  it("左辺: 右へ動かすと幅が縮み、右辺は動かない", () => {
    const resized = bubble.resizeByEdge("w", { x: 80, y: 0 }, MIN);
    expect(resized.size).toEqual({ width: 320, height: 300 });
    expect(resized.position.x).toBe(80);
    expect(rightEdge(resized)).toBe(rightEdge(bubble));
  });

  it("左辺: 最小幅で止まっても右辺は動かない", () => {
    const resized = bubble.resizeByEdge("w", { x: 1000, y: 0 }, MIN);
    expect(resized.size?.width).toBe(MIN.width);
    expect(rightEdge(resized)).toBe(rightEdge(bubble));
  });

  it("右辺: 幅だけ変わり、位置は動かない", () => {
    const resized = bubble.resizeByEdge("e", { x: 70, y: 0 }, MIN);
    expect(resized.size).toEqual({ width: 470, height: 300 });
    expect(resized.position).toEqual(bubble.position);
  });

  it("下辺: 高さだけ変わり、位置と幅は動かない", () => {
    const resized = bubble.resizeByEdge("s", { x: 999, y: 50 }, MIN);
    expect(resized.size).toEqual({ width: 400, height: 350 });
    expect(resized.position).toEqual(bubble.position);
  });

  it("左下: 幅と高さが変わり、右辺と上辺は固定", () => {
    const resized = bubble.resizeByEdge("sw", { x: -60, y: 40 }, MIN);
    expect(resized.size).toEqual({ width: 460, height: 340 });
    expect(rightEdge(resized)).toBe(rightEdge(bubble));
    expect(resized.position.y).toBe(bubble.position.y);
  });

  it("奥の面でも universe 上の右辺は動かない（scale と offset の取り違えが起きない）", () => {
    // 画面に出ている実物（universe 座標の左上 + スクリーン実寸）から起点を作る手順を再現する
    const universeTopLeft = { x: 400, y: 200 };
    const screenSize = { width: 300 * deep.scale, height: 200 * deep.scale };
    const start = makeBubble(deep.locate(universeTopLeft), deep.scaleScreenSize(screenSize));
    const universeRight = (b: Bubble) => deep.place(b.position).x + (b.size?.width ?? 0) * deep.scale;

    const resized = start.resizeByEdge("w", deep.scaleScreenDelta({ x: 60, y: 0 }), MIN);

    expect(universeRight(resized)).toBeCloseTo(universeRight(start));
    expect(deep.place(resized.position).x).toBeCloseTo(universeTopLeft.x + 60);
  });

  it("等倍の面では place / locate が往復する", () => {
    const b = makeBubble(surface.locate({ x: 300, y: 200 }), { width: 400, height: 300 });
    expect(surface.place(b.position)).toEqual({ x: 300, y: 200 });
  });
});

describe("Bubble.resizeByEdge — universe の縁で止まる", () => {
  const bubble = makeBubble({ x: 40, y: 0 }, { width: 400, height: 300 });
  const rightEdge = (b: Bubble) => b.position.x + (b.size?.width ?? 0);

  it("左辺は minX より左へ出ない（右辺は動かない）", () => {
    const resized = bubble.resizeByEdge("w", { x: -500, y: 0 }, MIN, { minX: 0 });
    expect(resized.position.x).toBe(0);
    expect(rightEdge(resized)).toBe(rightEdge(bubble));
    expect(resized.size?.width).toBe(440); // 縁で止まったぶんだけ広がる
  });

  it("縁の手前までは普通に広がる", () => {
    const resized = bubble.resizeByEdge("w", { x: -30, y: 0 }, MIN, { minX: 0 });
    expect(resized.position.x).toBe(10);
    expect(resized.size?.width).toBe(430);
    expect(rightEdge(resized)).toBe(rightEdge(bubble));
  });

  it("左下も同じく縁で止まり、高さは指示どおり変わる", () => {
    const resized = bubble.resizeByEdge("sw", { x: -500, y: 60 }, MIN, { minX: 0 });
    expect(resized.position.x).toBe(0);
    expect(resized.size).toEqual({ width: 440, height: 360 });
    expect(rightEdge(resized)).toBe(rightEdge(bubble));
  });

  it("minX を渡さなければ従来どおり制限しない", () => {
    const resized = bubble.resizeByEdge("w", { x: -500, y: 0 }, MIN);
    expect(resized.position.x).toBe(-460);
    expect(rightEdge(resized)).toBe(rightEdge(bubble));
  });
});
