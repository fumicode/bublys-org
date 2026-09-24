import {
  anchoredRect,
  slotStyle,
  edgesNear,
  edgesOf,
  fitAmongDocked,
  isShowreSide,
  rectsOverlap,
  snapToViewport,
  touchingEdges,
  SHOWRE_DOCK_GAP,
  type DockState,
  type ScreenRect,
  clampMoveAmongDocked,
  clampResizeAmongDocked,
} from "./Showre.domain.js";
import { TUBE_THICKNESS } from "./tube.js";

const VIEWPORT = { width: 1000, height: 600 };

/**
 * 岸に貼り付いたものどうしは、**管が 1 本に見えるぶん（管の太さ）だけ重なる**のが正しい。
 * それを超えて食い込んでいないことを見る。
 */
const merged = (a: ScreenRect, b: ScreenRect): boolean => {
  const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return ox <= TUBE_THICKNESS || oy <= TUBE_THICKNESS;
};
const dock = (edges: DockState["edges"], at: { x: number; y: number }): DockState => ({ edges, at });
const rectOf = (x: number, y: number, w: number, h: number): ScreenRect => ({ x, y, width: w, height: h });
/** 既定の大きさ。岸は大きさを持たないので、呼ぶ側が渡す */
const SIZE = { width: 200, height: 150 };

describe("edgesNear（落とした点が、どの辺に貼り付くか）", () => {
  it("辺の近くならその辺", () => {
    expect(edgesNear({ x: 5, y: 300 }, VIEWPORT)).toEqual(["left"]);
    expect(edgesNear({ x: 995, y: 300 }, VIEWPORT)).toEqual(["right"]);
    expect(edgesNear({ x: 500, y: 5 }, VIEWPORT)).toEqual(["top"]);
    expect(edgesNear({ x: 500, y: 595 }, VIEWPORT)).toEqual(["bottom"]);
  });

  it("角の近くなら 2 辺", () => {
    expect(edgesNear({ x: 5, y: 5 }, VIEWPORT).sort()).toEqual(["left", "top"]);
    expect(edgesNear({ x: 995, y: 595 }, VIEWPORT).sort()).toEqual(["bottom", "right"]);
  });

  it("どの辺からも遠ければ空（海に浮く）", () => {
    expect(edgesNear({ x: 500, y: 300 }, VIEWPORT)).toEqual([]);
  });
});

describe("anchoredRect（貼った辺に合わせ、直交する向きは落とした場所のまま）", () => {
  it("左辺: x は 0、y は落とした場所", () => {
    expect(anchoredRect(dock(["left"], { x: 12, y: 220 }), SIZE, VIEWPORT)).toEqual({ x: 0, y: 220, width: 200, height: 150 });
  });

  it("右辺: 右端に揃う", () => {
    expect(anchoredRect(dock(["right"], { x: 980, y: 100 }), SIZE, VIEWPORT)).toEqual({ x: 800, y: 100, width: 200, height: 150 });
  });

  it("下辺: 下端に揃い、x は落とした場所", () => {
    expect(anchoredRect(dock(["bottom"], { x: 300, y: 590 }), SIZE, VIEWPORT)).toEqual({ x: 300, y: 450, width: 200, height: 150 });
  });

  it("角: 2 辺とも合わせる", () => {
    expect(anchoredRect(dock(["left", "top"], { x: 5, y: 5 }), SIZE, VIEWPORT)).toEqual({ x: 0, y: 0, width: 200, height: 150 });
  });

  it("画面からはみ出させない", () => {
    expect(anchoredRect(dock(["left"], { x: 0, y: 590 }), SIZE, VIEWPORT).y).toBe(450);
    expect(anchoredRect(dock(["top"], { x: 990, y: 0 }), SIZE, VIEWPORT).x).toBe(800);
  });

  it("大きさは持っているものそのまま（辺いっぱいには広げない）", () => {
    const r = anchoredRect(dock(["left"], { x: 0, y: 100 }), { width: 240, height: 90 }, VIEWPORT);
    expect([r.width, r.height]).toEqual([240, 90]);
  });
});

describe("大きさを変えても、貼った辺は動かない（岸は大きさを持たない）", () => {
  it("下辺に貼ったまま小さくすると、下辺はそのまま・上辺が下がる", () => {
    const d = dock(["bottom"], { x: 300, y: 590 });
    const before = anchoredRect(d, { width: 200, height: 150 }, VIEWPORT);
    const after = anchoredRect(d, { width: 200, height: 100 }, VIEWPORT);
    expect(before.y + before.height).toBe(600);
    expect(after.y + after.height).toBe(600); // 下辺は動かない
    expect(after.y).toBe(500); // 上辺だけが動く
  });

  it("右辺に貼ったまま細くすると、右辺はそのまま・左辺が動く", () => {
    const d = dock(["right"], { x: 980, y: 100 });
    const after = anchoredRect(d, { width: 120, height: 150 }, VIEWPORT);
    expect(after.x + after.width).toBe(1000);
  });

  it("置き場所は辺で留める。大きさは書かない（バブル自身が決める）", () => {
    expect(slotStyle(dock(["bottom"], { x: 300, y: 590 }), VIEWPORT)).toEqual({ left: 300, bottom: 0 });
    expect(slotStyle(dock(["left"], { x: 0, y: 220 }), VIEWPORT, { width: 200, height: 150 }))
      .toEqual({ left: 0, top: 220 });
    expect(slotStyle(dock(["right", "top"], { x: 980, y: 5 }), VIEWPORT)).toEqual({ right: 0, top: 0 });
  });
});

describe("fitAmongDocked（後から来た方が縮む）", () => {
  const at = (x: number, y: number, w: number, h: number): ScreenRect => ({ x, y, width: w, height: h });

  it("先客が居なければ、そのままの大きさで貼る", () => {
    expect(fitAmongDocked(dock(["left"], { x: 0, y: 100 }), SIZE, VIEWPORT, [], { x: 5, y: 160 })).toEqual(at(0, 100, 200, 150));
  });

  it("先客の下に落とせば、落とした場所のまま。縮まない", () => {
    const others = [at(0, 0, 200, 300)];
    const r = fitAmongDocked(dock(["left"], { x: 0, y: 320 }), SIZE, VIEWPORT, others, { x: 5, y: 380 })!;
    expect(r.y).toBe(320); // 空き（294〜600）に収まるので、落とした場所のまま
    expect(r.height).toBe(150);
    expect(others.every((o) => !rectsOverlap(o, r))).toBe(true);
  });

  it("先客に食い込む場所に落としたら、空きの端まで押し戻される", () => {
    const others = [at(0, 0, 200, 300)];
    // 落とした場所は 280（先客に食い込む）→ 先客の下端 300 へ押し戻される
    const r = fitAmongDocked(dock(["left"], { x: 0, y: 280 }), SIZE, VIEWPORT, others, { x: 5, y: 360 })!;
    expect(r.y).toBe(300 + SHOWRE_DOCK_GAP);   // 管が 1 本になる所まで寄る
    expect(others.every((o) => merged(o, r))).toBe(true);
  });

  it("空きが足りなければ、その空きに収まるまで縮む", () => {
    // 上に 300、下に 480 から先客。空きは 294〜486 の 192px（管が 1 本になるぶん重なれる）
    const others = [at(0, 0, 200, 300), at(0, 480, 200, 120)];
    const r = fitAmongDocked(dock(["left"], { x: 0, y: 380 }), { width: 200, height: 400 }, VIEWPORT, others, { x: 5, y: 400 })!;
    expect(r.y).toBe(294);
    expect(r.height).toBe(192);
    expect(others.every((o) => merged(o, r))).toBe(true);
  });

  it("先客の上に落とそうとしたら、そこには貼れない", () => {
    const others = [at(0, 100, 200, 300)];
    expect(fitAmongDocked(dock(["left"], { x: 0, y: 200 }), SIZE, VIEWPORT, others, { x: 5, y: 250 })).toBeNull();
  });

  it("空きが下限より狭ければ貼れない", () => {
    // 空きは 294〜326 の 32px。下限（36px）より狭い
    const others = [at(0, 0, 200, 300), at(0, 320, 200, 280)];
    expect(fitAmongDocked(dock(["left"], { x: 0, y: 305 }), SIZE, VIEWPORT, others, { x: 5, y: 310 })).toBeNull();
  });

  it("違う辺の先客は邪魔しない（右辺の先客は、左辺に貼るとき数えない）", () => {
    const others = [at(800, 0, 200, 600)];
    expect(fitAmongDocked(dock(["left"], { x: 0, y: 100 }), SIZE, VIEWPORT, others, { x: 5, y: 160 })).toEqual(at(0, 100, 200, 150));
  });

  it("背の高いバブルでも、落とした点が空きに入っていれば、その空きに縮んで入る", () => {
    // 先客は 300〜531。落とした点は 150（その上の空き 0〜306）
    const others = [at(0, 300, 183, 231)];
    const r = fitAmongDocked(dock(["left"], { x: 0, y: 100 }), { width: 200, height: 360 }, VIEWPORT, others, { x: 5, y: 150 })!;
    expect(r.y).toBe(0);
    expect(r.height).toBe(306);
    expect(merged(others[0], r)).toBe(true);
  });

  it("上辺では横向きに縮む", () => {
    const others = [at(0, 0, 300, 150)];
    const r = fitAmongDocked(dock(["top"], { x: 400, y: 0 }), { width: 800, height: 150 }, VIEWPORT, others, { x: 500, y: 5 })!;
    expect(r.x).toBe(294);
    expect(r.width).toBe(706);
    expect(merged(others[0], r)).toBe(true);
  });

  // 縮む向きは決め打ちできない ── 滑る向きで空きが無ければ、貼った向きで縮んでから滑る
  it("全高の先客がいても、反対の辺に貼れる（横向きに縮む）", () => {
    const others = [at(0, 0, 400, VIEWPORT.height)];
    const r = fitAmongDocked(
      dock(["right"], { x: 400, y: 40 }),
      { width: 600, height: 500 },
      VIEWPORT,
      others,
      { x: VIEWPORT.width - 5, y: 300 },
    );
    expect(r).not.toBeNull();
    expect(r!.x + r!.width).toBe(VIEWPORT.width);
    // 先客の右に 606 空いているので、縮まず自分の大きさのまま入る
    expect(r!.width).toBe(600);
  });

  it("岸だけで埋まってよい ── 海の取り分は残さない", () => {
    const others = [at(0, 0, 400, VIEWPORT.height)];
    const r = fitAmongDocked(
      dock(["right"], { x: 400, y: 0 }),
      { width: 2000, height: VIEWPORT.height },
      VIEWPORT,
      others,
      { x: VIEWPORT.width - 5, y: 300 },
    )!;
    // 先客の右端から画面の右端まで、隙間なく埋まる（管のぶんだけ重なる）
    expect(r.x).toBe(394);
    expect(r.x + r.width).toBe(VIEWPORT.width);
  });
});

describe("edgesOf / isShowreSide", () => {
  it("貼っていなければ空", () => {
    expect(edgesOf({}, "a")).toEqual([]);
    expect(edgesOf({ a: dock(["left"], { x: 0, y: 0 }) }, "a")).toEqual(["left"]);
  });
  it("4 辺の文字列だけを通す", () => {
    expect(isShowreSide("top")).toBe(true);
    expect(isShowreSide("center")).toBe(false);
  });
});

describe("touchingEdges（いまどの辺に着いているか）", () => {
  it("留め方ではなく、いまの位置で決まる（下辺に留めたまま左端まで伸ばせば左にも着く）", () => {
    const rect = rectOf(0, 450, 700, 150); // 左端 + 下端まで届いている
    expect(touchingEdges(rect, VIEWPORT).sort()).toEqual(["bottom", "left"]);
  });

  it("縁から離れていれば、その辺には着いていない", () => {
    expect(touchingEdges(rectOf(20, 450, 200, 150), VIEWPORT)).toEqual(["bottom"]);
  });

  it("下辺いっぱいに伸ばせば 3 辺に着く（左・下・右）", () => {
    const rect = rectOf(0, 450, VIEWPORT.width, 150);
    expect(touchingEdges(rect, VIEWPORT).sort()).toEqual(["bottom", "left", "right"]);
  });

  it("四辺いっぱいなら 4 辺とも着いている", () => {
    expect(touchingEdges(rectOf(0, 0, VIEWPORT.width, VIEWPORT.height), VIEWPORT).sort())
      .toEqual(["bottom", "left", "right", "top"]);
  });
});

describe("snapToViewport（縁の近くは、ぴたりと合わせる）", () => {
  it("数 px だけ空いた辺は、縁まで伸ばす", () => {
    expect(snapToViewport(rectOf(4, 100, 200, 150), VIEWPORT)).toEqual(rectOf(0, 100, 204, 150));
  });

  it("右辺・下辺も同じ", () => {
    const r = snapToViewport(rectOf(700, 100, 297, 150), VIEWPORT);
    expect(r.x + r.width).toBe(VIEWPORT.width);
  });

  it("離れている辺は動かさない", () => {
    const r = rectOf(100, 100, 200, 150);
    expect(snapToViewport(r, VIEWPORT)).toEqual(r);
  });
});

/**
 * 岸に貼り付いたものどうしは重ならない（規則4）。貼るときだけでなく、
 * **貼ったあと動かす・伸ばす**ときも同じ。止まるのは**ぴったり接する所**。
 */
describe("clampResizeAmongDocked / clampMoveAmongDocked（岸の上では重ならない）", () => {
  const at = (x: number, y: number, w: number, h: number): ScreenRect => ({ x, y, width: w, height: h });

  it("右へ伸ばすと、先客の左端でぴったり止まる", () => {
    const others = [at(500, 0, 200, 200)];
    const r = clampResizeAmongDocked(at(0, 0, 800, 200), "right", others);
    expect(r.width).toBe(506);
    // 管の中心線どうしが重なる（管の太さぶん食い込む）＝ 1 本の線に見える
    expect(r.x + r.width).toBe(others[0].x + TUBE_THICKNESS);
    expect(merged(others[0], r)).toBe(true);
  });

  it("左へ伸ばすと、先客の右端で止まる（向かいの辺は動かない）", () => {
    const others = [at(0, 0, 200, 200)];
    const r = clampResizeAmongDocked(at(100, 0, 700, 200), "left", others);
    expect(r.x).toBe(200 - TUBE_THICKNESS);
    expect(r.x + r.width).toBe(800);   // 向かいの辺は動かない
  });

  it("もう一方の向きで重なっていない先客は邪魔しない", () => {
    const others = [at(500, 400, 200, 200)];
    expect(clampResizeAmongDocked(at(0, 0, 800, 200), "right", others).width).toBe(800);
  });

  it("滑らせると、先客の手前で止まる", () => {
    const others = [at(0, 400, 200, 200)];
    const r = clampMoveAmongDocked(at(0, 300, 200, 150), "y", others, VIEWPORT, 100);
    expect(r.y + 150).toBe(400 + TUBE_THICKNESS);   // 管が 1 本になる所
    expect(merged(others[0], r)).toBe(true);
  });

  it("戻る向きへ滑らせたときも、先客の向こうで止まる", () => {
    const others = [at(0, 0, 200, 200)];
    const r = clampMoveAmongDocked(at(0, 100, 200, 150), "y", others, VIEWPORT, 300);
    expect(r.y).toBe(200 - TUBE_THICKNESS);
    expect(merged(others[0], r)).toBe(true);
  });

  it("先客が居なければ、そのまま", () => {
    expect(clampMoveAmongDocked(at(0, 300, 200, 150), "y", [], VIEWPORT, 100).y).toBe(300);
  });
});
