import { TUBE_RADIUS, TUBE_THICKNESS, detourCuts, tubePath } from "./tube.js";

/**
 * 管は「中心線」で表す。接している辺には引かず、直交する走りは相手の管まで伸ばす
 * ── これだけで接ぎ目が 1 本につながる。
 */
const RECT = { x: 0, y: 0, width: 200, height: 100 };
const HALF = TUBE_THICKNESS / 2;
const CORNER = TUBE_RADIUS - HALF;

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

/** path のコマンドごとの終点（M / L は座標そのもの、A は最後の 2 つ） */
const ends = (d: string): [number, number][] =>
  (d.match(/[MLA][^MLAZ]*/g) ?? []).map((cmd) => {
    const n = (cmd.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    return [n[n.length - 2], n[n.length - 1]] as [number, number];
  });

/** その辺（中心線）の上に乗っている終点を、走る向きの座標で並べたもの */
const stopsOn = (d: string, axis: "x" | "y", at: number): number[] =>
  ends(d)
    .filter((p) => (axis === "x" ? p[0] : p[1]) === at)
    .map((p) => (axis === "x" ? p[1] : p[0]))
    .sort((a, b) => a - b);

/**
 * 迂回（もう 1 つの描き方）。岸の管は、泡の所で**泡の枠のほうへ回り込む**。
 * 泡と画面の縁の間には通らない ── だから付け根が T 字にならない。
 */
describe("tubePath（通さない区間 ＝ 迂回）", () => {
  const VIEW = { x: 0, y: 0, width: 1000, height: 800 };
  /** 左の岸に着いた泡（y は 100〜400） */
  const DOCKED = { x: 0, y: 100, width: 250, height: 300 };

  it("辺の途中に通さない区間があると、そこで切れる（輪が 1 本の線になる）", () => {
    const d = tubePath({ rect: RECT, cuts: [{ side: "top", from: 60, to: 120 }] });
    expect((d.match(/M/g) ?? []).length).toBe(1); // ひと続き
    expect(d.includes("Z")).toBe(false); // 閉じない
    expect((d.match(/A/g) ?? []).length).toBe(4); // 角は 4 つとも丸いまま
    // 上辺の走りは、区間の手前と向こうで止まる
    expect(stopsOn(d, "y", HALF)).toEqual([HALF + CORNER, 60, 120, RECT.width - HALF - CORNER]);
  });

  it("岸の管は、泡が接している範囲だけ抜ける（泡と縁の間には通らない）", () => {
    const d = tubePath({ rect: VIEW, cuts: detourCuts(DOCKED, ["left"]) });
    // 左辺に乗る終点 ── 上から順に「上の角・泡の上端・泡の下端・下の角」
    expect(stopsOn(d, "x", HALF)).toEqual([HALF + CORNER, 100, 400, VIEW.height - HALF - CORNER]);
  });

  it("抜けるのは帯では泡の縁まで、芯では泡の中心線まで（T 字と同じ決まり）", () => {
    const d = tubePath({ rect: VIEW, cuts: detourCuts(DOCKED, ["left"]) }, { joinAt: "center" });
    expect(stopsOn(d, "x", HALF)).toEqual([HALF + CORNER, 100 + HALF, 400 - HALF, VIEW.height - HALF - CORNER]);
  });

  it("通さない区間が辺いっぱいなら、その辺は消える", () => {
    const d = tubePath({ rect: RECT, cuts: [{ side: "left", from: 0, to: RECT.height }] });
    expect((d.match(/M/g) ?? []).length).toBe(1);
    expect(d.includes("Z")).toBe(false);
    expect((d.match(/A/g) ?? []).length).toBe(2); // 残る 3 辺をつなぐ 2 角だけ
  });

  it("2 辺に着いた泡なら、その 2 辺とも抜ける", () => {
    const corner = { x: 0, y: 0, width: 250, height: 300 };
    const cuts = detourCuts(corner, ["top", "left"]);
    expect(cuts).toEqual([
      { side: "top", from: 0, to: 250 },
      { side: "left", from: 0, to: 300 },
    ]);
    const d = tubePath({ rect: VIEW, cuts });
    expect(stopsOn(d, "y", HALF)).toEqual([250, VIEW.width - HALF - CORNER]); // 上辺は泡の右端から
    expect(stopsOn(d, "x", HALF)).toEqual([300, VIEW.height - HALF - CORNER]); // 左辺は泡の下端から
  });
});
