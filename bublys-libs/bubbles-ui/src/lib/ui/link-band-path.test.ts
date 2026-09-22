import { cornerRadiusFor, frustumBand } from "./link-band-path.js";

const r = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

/** パスの頂点（M / L の点と、C の終点）を拾う */
const vertices = (path: string): [number, number][] =>
  [...path.matchAll(/(?:M|L) (-?[\d.]+) (-?[\d.]+)|C (?:-?[\d.]+ ){4}(-?[\d.]+) (-?[\d.]+)/g)].map((m) =>
    m[1] !== undefined ? [Number(m[1]), Number(m[2])] : [Number(m[3]), Number(m[4])],
  );

describe("frustumBand（起点が拡大されて openee になった錐台）", () => {
  it("右に拡大: 上下の橋が輪郭。openee の左辺に着き、起点は帯に含まれる", () => {
    const origin = r(100, 100, 120, 120);
    const openee = r(300, 50, 600, 400);
    const band = frustumBand(origin, openee)!;
    expect(band.openeeEdges).toEqual(["left"]);
    // 起点の左上 → (曲線) openee 左上 → L openee 左下 → (曲線) 起点 左下 → L 起点 左上
    expect(band.path).toBe("M 100 100 C 200 100 200 50 300 50 L 300 400 C 200 400 200 120 100 120 L 100 100 Z");
  });

  it("左に拡大（右の岸から開いたとき）: openee の右辺に着く", () => {
    const origin = r(500, 100, 520, 120);
    const openee = r(0, 50, 300, 400);
    const band = frustumBand(origin, openee)!;
    expect(band.openeeEdges).toEqual(["right"]);
    const v = vertices(band.path);
    // 橋は 右上↔右上 と 右下↔右下。openee 側は右辺（右上・右下）だけを通り、左辺は通らない
    expect(v).toContainEqual([300, 50]);
    expect(v).toContainEqual([300, 400]);
    expect(v).not.toContainEqual([0, 50]);
    expect(v).not.toContainEqual([0, 400]);
  });

  it("下に拡大（上の岸から開いたとき）: openee の上辺に着き、縦の S 字", () => {
    const origin = r(100, 0, 200, 20);
    const openee = r(0, 100, 600, 400);
    const band = frustumBand(origin, openee)!;
    expect(band.openeeEdges).toEqual(["top"]);
    // 縦の S 字: 制御点の y が中点（50）
    expect(band.path).toMatch(/C 100 50 0 50 0 100|C 200 50 600 50 600 100/);
  });

  it("上に拡大（下の岸から開いたとき）: openee の下辺に着く", () => {
    const origin = r(100, 500, 200, 520);
    const openee = r(0, 100, 600, 400);
    const band = frustumBand(origin, openee)!;
    expect(band.openeeEdges).toEqual(["bottom"]);
  });

  it("斜め（右下）に拡大: 橋は右上と左下、openee には上辺と左辺の 2 辺で着く", () => {
    const origin = r(100, 100, 120, 120);
    const openee = r(300, 300, 600, 600);
    const band = frustumBand(origin, openee)!;
    expect(band.openeeEdges.sort()).toEqual(["left", "top"]);
    const v = vertices(band.path);
    // openee 側は 右上 → 左上 → 左下（近い側の周）、起点側は 左下 → 左上 → 右上（遠い側の周）
    expect(v).toContainEqual([300, 300]);
    expect(v).toContainEqual([100, 100]);
    expect(v).not.toContainEqual([600, 600]);
    expect(v).not.toContainEqual([120, 120]);
  });

  it("一方が他方を含めば帯は無い", () => {
    expect(frustumBand(r(200, 200, 220, 220), r(0, 0, 600, 600))).toBeNull();
    expect(frustumBand(r(0, 0, 600, 600), r(200, 200, 220, 220))).toBeNull();
  });

  it("縦に並ぶ一覧の行から右に開いても、輪郭は行の左右の橋で、行の下辺を横切らない", () => {
    const row = r(100, 300, 300, 324);
    const openee = r(400, 100, 800, 500);
    const band = frustumBand(row, openee)!;
    expect(band.openeeEdges).toEqual(["left"]);
    const v = vertices(band.path);
    // 起点側で通るのは行の左端の 2 点だけ（遠い側の周）。右端（次の行に近い側）は通らない
    expect(v).toContainEqual([100, 300]);
    expect(v).toContainEqual([100, 324]);
    expect(v).not.toContainEqual([300, 324]);
    expect(v).not.toContainEqual([300, 300]);
  });
});

describe("cornerRadiusFor（帯に使われている辺の角だけ角張る）", () => {
  it("帯が無ければ全部丸い", () => {
    expect(cornerRadiusFor(undefined, "24px")).toBe("24px 24px 24px 24px");
    expect(cornerRadiusFor([], "24px")).toBe("24px 24px 24px 24px");
  });
  it("右辺に帯 → 右上・右下が角張る", () => {
    expect(cornerRadiusFor(["right"], "24px")).toBe("24px 0 0 24px");
  });
  it("左辺に帯 → 左上・左下", () => {
    expect(cornerRadiusFor(["left"], "24px")).toBe("0 24px 24px 0");
  });
  it("上辺と左辺（斜め）→ 左上・右上・左下", () => {
    expect(cornerRadiusFor(["top", "left"], "24px")).toBe("0 0 24px 0");
  });
  it("下辺に帯 → 右下・左下（下の丸みは別指定できる）", () => {
    expect(cornerRadiusFor(["bottom"], "24px", "50%")).toBe("24px 24px 0 0");
    expect(cornerRadiusFor([], "24px", "50%")).toBe("24px 24px 50% 50%");
  });
});
