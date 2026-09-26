import { DEFAULT_LAUNCHER_METRICS as M, launcherLayout, twoIcons } from "./LauncherLayout.js";

/**
 * 規則: ラベル付きで縦に全部並ぶならそれ。無理ならアイコンだけにして、
 * 縦と横で多く入る方に並べる。入り切らないぶんはスクロールで見る。
 * 縦も横もアイコン 2 つに届かない箱のときだけ、1 つにまとまる。
 */
describe("launcherLayout（並べ方は箱の大きさで決まる）", () => {
  it("ラベルの幅があって、高さに全部入るなら、縦にラベル付き", () => {
    expect(launcherLayout({ width: 200, height: 400 }, 5)).toEqual({
      direction: "vertical",
      labels: true,
      collapsed: false,
    });
  });

  it("縦に並んでいても、横幅がラベルに足りなければアイコン表示", () => {
    // 幅 80（ラベルには足りない）・高さ 400 → 縦のままアイコンだけ
    expect(launcherLayout({ width: 80, height: 400 }, 5)).toEqual({
      direction: "vertical",
      labels: false,
      collapsed: false,
    });
  });

  it("高さが足りないときは、横の方が多く入るなら横並びになる", () => {
    // 5 項目 × 44 = 220 > 高さ 100。横は 800/44 = 18 個、縦は 2 個
    expect(launcherLayout({ width: 800, height: 100 }, 5)).toEqual({
      direction: "horizontal",
      labels: false,
      collapsed: false,
    });
  });

  it("高さが足りなくても、縦の方が多く入るなら縦のまま（アイコン表示）", () => {
    // 20 項目は高さ 400 に入らない。縦 9 個 > 横 4 個
    expect(launcherLayout({ width: 200, height: 400 }, 20)).toEqual({
      direction: "vertical",
      labels: false,
      collapsed: false,
    });
  });

  it("同じ数だけ入るなら縦", () => {
    const box = { width: 4 * M.iconSize, height: 4 * M.iconSize };
    expect(launcherLayout(box, 10)).toEqual({ direction: "vertical", labels: false, collapsed: false });
  });

  it("ラベルの幅ちょうど・高さちょうどなら、まだラベル付き", () => {
    expect(launcherLayout({ width: M.labeledWidth, height: 3 * M.rowHeight }, 3)).toEqual({
      direction: "vertical",
      labels: true,
      collapsed: false,
    });
  });

  it("項目が 1 つ増えて高さに入らなくなったら、アイコン表示に落ちる", () => {
    const box = { width: M.labeledWidth, height: 3 * M.rowHeight };
    expect(launcherLayout(box, 4).labels).toBe(false);
  });

  it("潰れた箱でも壊れない（何も置けないなら 1 つにまとまる）", () => {
    expect(launcherLayout({ width: 0, height: 0 }, 3).collapsed).toBe(true);
  });

  /**
   * ★ **入り切らないことは、姿を落とす理由にならない。** 短い箱に合わせて 1 つにまとめても
   *   行き先の数は減らないので、はみ出したぶんはスクロールで見る。
   */
  it("入り切らなくても、並べられる箱なら並べたまま（スクロールで見る）", () => {
    // 岸の帯（幅 34・高さ 641 ＝ iPhone SE の左の縁）に 11 項目。縦は 14 個ぶんだが…
    expect(launcherLayout({ width: 34, height: 641 }, 11).collapsed).toBe(false);
    // …項目が 40 個あって入り切らなくても、まとまらない
    expect(launcherLayout({ width: 34, height: 641 }, 40)).toEqual({
      direction: "vertical",
      labels: false,
      collapsed: false,
    });
  });

  it("縦も横もアイコン 2 つに届かないときだけ、1 つにまとまる", () => {
    const min = twoIcons();              // 44×2 ＋ 余白 4×2 ＝ 96
    expect(min).toBe(96);
    expect(launcherLayout({ width: min, height: min }, 11).collapsed).toBe(false);
    expect(launcherLayout({ width: min - 1, height: min - 1 }, 11).collapsed).toBe(true);
    // 片方だけ足りないなら、まとまらない（その向きに並べられる）
    expect(launcherLayout({ width: min - 1, height: 400 }, 11).collapsed).toBe(false);
    expect(launcherLayout({ width: 400, height: min - 1 }, 11).collapsed).toBe(false);
  });

  it("岸に 48×48 で貼ったら 1 つにまとまる（枠のぶんを引いて 22×22）", () => {
    expect(launcherLayout({ width: 22, height: 22 }, 11).collapsed).toBe(true);
  });
});
