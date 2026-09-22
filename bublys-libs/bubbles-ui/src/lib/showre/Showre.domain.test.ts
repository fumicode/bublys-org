import { Showres, nearestShowreSide, isVerticalShowre, isShowreSide } from "./Showre.domain.js";

describe("Showres", () => {
  it("empty() はどの岸にも誰も居ない", () => {
    const s = Showres.empty();
    expect(s.allIds).toEqual([]);
    expect(s.sideOf("A")).toBeUndefined();
  });

  it("dock() で岸に着き、sideOf / on で引ける", () => {
    const s = Showres.empty().dock("A", "left");
    expect(s.sideOf("A")).toBe("left");
    expect(s.on("left")).toEqual(["A"]);
  });

  it("dock() は新しいインスタンスを返す（不変）", () => {
    const s0 = Showres.empty();
    const s1 = s0.dock("A", "left");
    expect(s1).not.toBe(s0);
    expect(s0.on("left")).toEqual([]);
  });

  it("index 省略は末尾、指定すればその位置、範囲外は端に丸める", () => {
    const s = Showres.empty().dock("A", "left").dock("B", "left");
    expect(s.on("left")).toEqual(["A", "B"]);
    expect(s.dock("C", "left", 0).on("left")).toEqual(["C", "A", "B"]);
    expect(s.dock("C", "left", 1).on("left")).toEqual(["A", "C", "B"]);
    expect(s.dock("C", "left", 99).on("left")).toEqual(["A", "B", "C"]);
    expect(s.dock("C", "left", -5).on("left")).toEqual(["C", "A", "B"]);
  });

  it("別の岸に dock() すると元の岸からは外れる（1 バブルは 1 岸にしか居ない）", () => {
    const s = Showres.empty().dock("A", "left").dock("A", "bottom");
    expect(s.on("left")).toEqual([]);
    expect(s.on("bottom")).toEqual(["A"]);
    expect(s.sideOf("A")).toBe("bottom");
  });

  it("同じ岸に dock() し直すと並び替えになる", () => {
    const s = Showres.empty().dock("A", "top").dock("B", "top").dock("C", "top");
    expect(s.move("C", "top", 0).on("top")).toEqual(["C", "A", "B"]);
    expect(s.move("A", "top", 2).on("top")).toEqual(["B", "C", "A"]);
  });

  it("undock() で浮く。居なければ同じインスタンス", () => {
    const s = Showres.empty().dock("A", "right").dock("B", "right");
    const u = s.undock("A");
    expect(u.on("right")).toEqual(["B"]);
    expect(u.sideOf("A")).toBeUndefined();
    expect(s.undock("Z")).toBe(s);
  });

  it("allIds は 4 辺のバブルをすべて返す", () => {
    const s = Showres.empty().dock("A", "top").dock("B", "left").dock("C", "left");
    expect(s.allIds.sort()).toEqual(["A", "B", "C"]);
  });

  it("fromJSON() は欠けている辺を空で補う（古い保存形式の互換）", () => {
    const s = Showres.fromJSON({ left: ["A"] });
    expect(s.on("left")).toEqual(["A"]);
    expect(s.on("top")).toEqual([]);
    expect(Showres.fromJSON(undefined).allIds).toEqual([]);
  });

  describe("order（先に貼った岸が角を取る）", () => {
    it("岸が使われ始めた順に並ぶ", () => {
      const s = Showres.empty().dock("A", "left").dock("B", "top").dock("C", "left");
      expect(s.order).toEqual(["left", "top"]);
    });

    it("誰も居なくなった岸は order から抜け、次に使われたら末尾に付く", () => {
      const s = Showres.empty().dock("A", "left").dock("B", "top");
      const emptiedLeft = s.undock("A");
      expect(emptiedLeft.order).toEqual(["top"]);
      expect(emptiedLeft.dock("A", "left").order).toEqual(["top", "left"]);
    });

    it("同じ岸の中の並び替えや、別の岸への移動でも、残っている岸の順は変わらない", () => {
      const s = Showres.empty().dock("A", "left").dock("B", "top").dock("C", "top");
      expect(s.move("C", "top", 0).order).toEqual(["left", "top"]);
      // A が left から bottom へ: left は空になって抜け、bottom が末尾に付く
      expect(s.dock("A", "bottom").order).toEqual(["top", "bottom"]);
    });

    it("order の無い古い保存形式は、辺の既定順（top, bottom, left, right）で補う", () => {
      const s = Showres.fromJSON({ left: ["A"], top: ["B"] });
      expect(s.order).toEqual(["top", "left"]);
    });

    it("order に居るが誰も居ない岸は捨て、居るのに order に無い岸は末尾に足す", () => {
      const s = Showres.fromJSON({ left: ["A"], right: ["B"], order: ["bottom", "right"] });
      expect(s.order).toEqual(["right", "left"]);
    });
  });

  it("toJSON() → fromJSON() で往復する", () => {
    const s = Showres.empty().dock("A", "top").dock("B", "bottom", 0);
    expect(Showres.fromJSON(s.toJSON()).toJSON()).toEqual(s.toJSON());
  });
});

describe("nearestShowreSide", () => {
  const size = { width: 1000, height: 600 };

  it("各辺の近くではその辺", () => {
    expect(nearestShowreSide({ x: 10, y: 300 }, size)).toBe("left");
    expect(nearestShowreSide({ x: 990, y: 300 }, size)).toBe("right");
    expect(nearestShowreSide({ x: 500, y: 10 }, size)).toBe("top");
    expect(nearestShowreSide({ x: 500, y: 590 }, size)).toBe("bottom");
  });

  it("同距離なら左右を優先", () => {
    expect(nearestShowreSide({ x: 0, y: 0 }, size)).toBe("left");
    expect(nearestShowreSide({ x: 1000, y: 600 }, size)).toBe("right");
  });
});

describe("isVerticalShowre / isShowreSide", () => {
  it("left / right が縦、top / bottom が横", () => {
    expect(isVerticalShowre("left")).toBe(true);
    expect(isVerticalShowre("right")).toBe(true);
    expect(isVerticalShowre("top")).toBe(false);
    expect(isVerticalShowre("bottom")).toBe(false);
  });

  it("4 辺の文字列だけを通す", () => {
    expect(isShowreSide("top")).toBe(true);
    expect(isShowreSide("center")).toBe(false);
    expect(isShowreSide(null)).toBe(false);
  });
});
