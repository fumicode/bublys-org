import { DEFAULT_LAUNCHER_METRICS as M, launcherLayout } from "./LauncherLayout.js";

/**
 * 規則: ラベル付きで縦に全部並ぶならそれ。無理ならアイコンだけにして、
 * 縦と横で多く入る方に並べる。
 */
describe("launcherLayout（並べ方は箱の大きさで決まる）", () => {
  it("ラベルの幅があって、高さに全部入るなら、縦にラベル付き", () => {
    expect(launcherLayout({ width: 200, height: 400 }, 5)).toEqual({
      direction: "vertical",
      labels: true,
    });
  });

  it("縦に並んでいても、横幅がラベルに足りなければアイコン表示", () => {
    // 幅 80（ラベルには足りない）・高さ 400 → 縦のままアイコンだけ
    expect(launcherLayout({ width: 80, height: 400 }, 5)).toEqual({
      direction: "vertical",
      labels: false,
    });
  });

  it("高さが足りないときは、横の方が多く入るなら横並びになる", () => {
    // 5 項目 × 44 = 220 > 高さ 100。横は 800/44 = 18 個、縦は 2 個
    expect(launcherLayout({ width: 800, height: 100 }, 5)).toEqual({
      direction: "horizontal",
      labels: false,
    });
  });

  it("高さが足りなくても、縦の方が多く入るなら縦のまま（アイコン表示）", () => {
    // 20 項目は高さ 400 に入らない。縦 9 個 > 横 4 個
    expect(launcherLayout({ width: 200, height: 400 }, 20)).toEqual({
      direction: "vertical",
      labels: false,
    });
  });

  it("同じ数だけ入るなら縦", () => {
    const box = { width: 4 * M.iconSize, height: 4 * M.iconSize };
    expect(launcherLayout(box, 10)).toEqual({ direction: "vertical", labels: false });
  });

  it("ラベルの幅ちょうど・高さちょうどなら、まだラベル付き", () => {
    expect(launcherLayout({ width: M.labeledWidth, height: 3 * M.rowHeight }, 3)).toEqual({
      direction: "vertical",
      labels: true,
    });
  });

  it("項目が 1 つ増えて高さに入らなくなったら、アイコン表示に落ちる", () => {
    const box = { width: M.labeledWidth, height: 3 * M.rowHeight };
    expect(launcherLayout(box, 4).labels).toBe(false);
  });

  it("潰れた箱でも壊れない（何も入らないときは縦）", () => {
    expect(launcherLayout({ width: 0, height: 0 }, 3)).toEqual({
      direction: "vertical",
      labels: false,
    });
  });
});
