import { TUBE_RADIUS, TUBE_THICKNESS, tubePath } from "./tube.js";

/**
 * 管は「中心線」で表す。接している辺には引かず、直交する走りは相手の管まで伸ばす
 * ── これだけで接ぎ目が 1 本につながる。
 */
const RECT = { x: 0, y: 0, width: 200, height: 100 };
const HALF = TUBE_THICKNESS / 2; // 6
const CORNER = TUBE_RADIUS - HALF; // 14

/** path の中の座標を順に取り出す */
const points = (d: string): number[] =>
  (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("tubePath（管の中心線）", () => {
  it("接している辺が無ければ、閉じた輪になる", () => {
    const d = tubePath({ rect: RECT });
    expect(d.startsWith("M")).toBe(true);
    expect(d.trim().endsWith("Z")).toBe(true);
    expect((d.match(/M/g) ?? []).length).toBe(1); // ひと続き
    expect((d.match(/A/g) ?? []).length).toBe(4); // 角は 4 つとも丸い
  });

  it("走りは辺から半分だけ内側（＝管の中心）", () => {
    const d = tubePath({ rect: RECT });
    // 最初の走りは上辺。y は T + half
    expect(points(d)[1]).toBe(HALF);
  });

  it("接している辺には引かない（その辺の走りが消え、subpath がひと続きになる）", () => {
    const d = tubePath({ rect: RECT, joined: ["left"] });
    expect((d.match(/M/g) ?? []).length).toBe(1);
    expect(d.includes("Z")).toBe(false); // 閉じない
    expect((d.match(/A/g) ?? []).length).toBe(2); // 右側の 2 角だけ丸い
  });

  it("接している辺では、直交する走りが矩形の縁まで伸びる（帯が隙間なく重なる）", () => {
    const d = tubePath({ rect: RECT, joined: ["left"] });
    const p = points(d);
    expect(p[0]).toBe(RECT.x); // 上辺の走りは左端（x=0）まで
    expect(p[p.length - 2]).toBe(RECT.x); // 下辺の走りも左端まで
  });

  it("芯は相手の中心線で止まる（T 字で出会って 1 本に見える）", () => {
    const d = tubePath({ rect: RECT, joined: ["left"] }, { joinAt: "center" });
    const p = points(d);
    expect(p[0]).toBe(RECT.x + HALF);
    expect(p[p.length - 2]).toBe(RECT.x + HALF);
  });

  it("接している辺の隣の角は丸めない（まっすぐ相手の管へ続く）", () => {
    const withLeft = tubePath({ rect: RECT, joined: ["left"] });
    const free = tubePath({ rect: RECT });
    expect((withLeft.match(/A/g) ?? []).length).toBeLessThan((free.match(/A/g) ?? []).length);
  });

  it("下辺で接していても、左上から右下へひと続きに引ける", () => {
    const d = tubePath({ rect: RECT, joined: ["bottom"] });
    expect((d.match(/M/g) ?? []).length).toBe(1);
    const p = points(d);
    // 走りは左辺の下端（y = B）から始まる
    expect(p[0]).toBe(RECT.x + HALF);
    expect(p[1]).toBe(RECT.y + RECT.height);
  });

  it("向かい合う 2 辺で接していると、走りは 2 本に分かれる", () => {
    const d = tubePath({ rect: RECT, joined: ["left", "right"] });
    expect((d.match(/M/g) ?? []).length).toBe(2);
    expect((d.match(/A/g) ?? []).length).toBe(0); // 角はどこも曲がらない
  });

  it("四辺とも接していれば、何も引かない", () => {
    expect(tubePath({ rect: RECT, joined: ["top", "right", "bottom", "left"] })).toBe("");
  });

  it("角の丸みは中心線の上で測る（太さの半分を引く）", () => {
    const d = tubePath({ rect: RECT });
    expect(d).toContain(`A ${CORNER} ${CORNER}`);
  });
});

describe("tubePath（3 辺・4 辺で接する場合）", () => {
  const WIDE = { x: 0, y: 450, width: 1000, height: 150 };

  it("3 辺に接していれば、残る 1 辺だけをまっすぐ引く", () => {
    const d = tubePath({ rect: WIDE, joined: ["left", "bottom", "right"] });
    expect((d.match(/M/g) ?? []).length).toBe(1);
    expect((d.match(/A/g) ?? []).length).toBe(0); // 曲がる角が無い
    const p = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    // 上辺の走りが、左の縁から右の縁まで通る
    expect(p[0]).toBe(WIDE.x);
    expect(p[2]).toBe(WIDE.x + WIDE.width);
    expect(p[1]).toBe(WIDE.y + TUBE_THICKNESS / 2);
  });

  it("3 辺接合の芯は、両端とも相手の中心線で止まる", () => {
    const d = tubePath({ rect: WIDE, joined: ["left", "bottom", "right"] }, { joinAt: "center" });
    const p = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    expect(p[0]).toBe(WIDE.x + TUBE_THICKNESS / 2);
    expect(p[2]).toBe(WIDE.x + WIDE.width - TUBE_THICKNESS / 2);
  });
});
