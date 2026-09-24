import { TUBE_CORE_WIDTH, TUBE_RADIUS, TUBE_THICKNESS, detourCuts, seaCapWidth, seaCaps, seaPath, tubePath } from "./tube.js";

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

describe("seaPath（海の輪郭を 1 本で）", () => {
  const VP = { x: 0, y: 0, width: 800, height: 600 };
  /** path のコマンド数（M が subpath の数） */
  const subpaths = (d: string) => (d.match(/M/g) ?? []).length;
  const corners = (d: string) => (d.match(/A/g) ?? []).length;

  it("岸に何も無ければ、ただの角丸の箱（閉じた輪 1 本）", () => {
    const d = seaPath(VP, []);
    expect(subpaths(d)).toBe(1);
    expect(corners(d)).toBe(4);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("縁に着いたものは切り抜かれ、**1 本のまま**まわりをなぞる", () => {
    // 左の縁いっぱいに貼ったもの（ランチャーのような帯）
    const d = seaPath(VP, [{ x: 0, y: 0, width: 60, height: 600 }]);
    expect(subpaths(d)).toBe(1);          // 途切れない
    // 丸いのは箱の 4 隅のうち、残っている右の 2 つだけ。
    // 帯の脇で曲がる 2 つは**海が凸**なので、丸めると海が減る ── 直角のまま
    expect(corners(d)).toBe(2);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("辺の途中に着いたものは、そこだけ凹んで曲がる（角が 4 つ増える）", () => {
    const d = seaPath(VP, [{ x: 300, y: 0, width: 200, height: 44 }]);
    expect(subpaths(d)).toBe(1);
    // 箱の 4 隅 ＋ 凹みの**底の 2 つだけ**（そこは海が凹んでいるので、丸めると海が増える）。
    // 凹みの入口 2 つは海が凸なので直角のまま
    expect(corners(d)).toBe(6);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("角に着いたものは、角が 2 つだけ増える（辺を 2 つ食べるので）", () => {
    const d = seaPath(VP, [{ x: 752, y: 552, width: 48, height: 48 }]);
    expect(subpaths(d)).toBe(1);
    // 箱の 4 隅のうち 1 つは食べられて 3 つ ＋ 食い込んだ角 1 つ
    expect(corners(d)).toBe(4);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("隣り合って着いたものは、1 つの凹みにつながる", () => {
    const apart = seaPath(VP, [
      { x: 100, y: 0, width: 100, height: 44 },
      { x: 400, y: 0, width: 100, height: 44 },
    ]);
    // 岸の上では、隣どうしは管の厚みぶん重なって着く（SHOWRE_DOCK_GAP ＝ −厚み）
    const together = seaPath(VP, [
      { x: 100, y: 0, width: 100, height: 44 },
      { x: 200 - TUBE_THICKNESS, y: 0, width: 100, height: 44 },
    ]);
    expect(corners(apart)).toBe(8);       // 箱 4 ＋ 凹みの底 2×2
    expect(corners(together)).toBe(6);    // 箱 4 ＋ つながった凹みの底 2
    expect(subpaths(together)).toBe(1);
  });

  it("★ 角丸は海を削らない ── 海が凸になる角は直角のまま", () => {
    // 辺の途中に貼ると、凹みの入口 2 つ（海が凸）と底 2 つ（海が凹）ができる。
    // 丸いのは底だけなので、弧の向きは**すべて海の外へ膨らむ向き**（sweep 0）になる
    const d = seaPath(VP, [{ x: 300, y: 0, width: 200, height: 44 }]);
    const sweeps = [...d.matchAll(/A [\d.]+ [\d.]+ 0 0 (\d)/g)].map((m) => m[1]);
    expect(sweeps.filter((v) => v === "1").length).toBe(4);   // 箱の 4 隅
    expect(sweeps.filter((v) => v === "0").length).toBe(2);   // 凹みの底
  });

  it("海が無くなったら、線も無い", () => {
    expect(seaPath(VP, [{ x: 0, y: 0, width: 800, height: 600 }])).toBe("");
  });
});

describe("seaPath の「引かない辺」（大元の岸に乗っている辺）", () => {
  const VP = { x: 0, y: 0, width: 800, height: 600 };

  it("引かない辺の線は消え、上下の線は**その辺のちょうど上**で終わる", () => {
    const d = seaPath(VP, [], { open: ["right"] });
    // 閉じない（隣の海の線が続きを持つ）
    expect(d.includes("Z")).toBe(false);
    // 右端 = 箱の中心線 X1 に、線の端がちょうど乗る
    const xs = [...d.matchAll(/[ML] ([\d.]+) ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...xs)).toBe(800 - TUBE_THICKNESS / 2);
  });

  it("引かない辺の隣の角は丸めない（そこで終わるので、丸める角が無い）", () => {
    const open = seaPath(VP, [], { open: ["right"] });
    const closed = seaPath(VP, []);
    expect((open.match(/A/g) ?? []).length).toBe(2);   // 左の 2 隅だけ
    expect((closed.match(/A/g) ?? []).length).toBe(4);
  });
});

describe("seaPath の「止める相手がいない端」", () => {
  const VP = { x: 0, y: 0, width: 800, height: 600 };

  it("★ 本線は曲げない ── 蓋は別の短い線として重ねる", () => {
    const line = seaPath(VP, [], { open: ["right"] });
    const caps = seaCaps(VP, { open: ["right"], extend: { right: { end: true } } });
    // 本線は蓋があっても変わらない（曲げない）
    expect(seaPath(VP, [], { open: ["right"] })).toBe(line);
    // 蓋は 1 本の直線。**本線の端のすぐ先**に、帯の太さぶんの長さで置く
    const X = 800 - TUBE_THICKNESS / 2;
    const Y = 600 - TUBE_THICKNESS / 2;
    // path の数は小数 2 桁で丸めて書き出す
    const at = Math.round((X + seaCapWidth(TUBE_THICKNESS) / 2) * 100) / 100;
    expect(caps).toBe(`M ${at} ${Y - TUBE_THICKNESS / 2} L ${at} ${Y + TUBE_THICKNESS / 2}`);
  });

  it("★ 蓋の太さは、ハイライトを挟んでいる青の片側と同じ", () => {
    // 帯 6px の真ん中を芯 1.5px が走るので、片側の青は (6 − 1.5) ÷ 2
    expect(seaCapWidth(TUBE_THICKNESS)).toBe((TUBE_THICKNESS - TUBE_CORE_WIDTH) / 2);
    expect(seaCapWidth(TUBE_THICKNESS)).toBeLessThan(TUBE_THICKNESS);
  });

  it("塞がっていない端には、蓋を足さない", () => {
    // 下の端だけ塞がっている ＝ 蓋は 1 つ
    const caps = seaCaps(VP, { open: ["right"], extend: { right: { end: true } } });
    expect((caps.match(/M/g) ?? []).length).toBe(1);
    // どちらも塞がっていなければ、蓋は無い
    expect(seaCaps(VP, { open: ["right"] })).toBe("");
  });
});
