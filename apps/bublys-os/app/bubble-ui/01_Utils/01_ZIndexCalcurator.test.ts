import ZIndexCalcurator from "./01_ZIndexCalcurator";

describe("ZIndexCalcurator", () => {
  let zIndexCalcurator: ZIndexCalcurator = new ZIndexCalcurator([
    "id1",
    "id2",
    "id3",
  ]);

  it("インスタンス化できる", () => {
    expect(zIndexCalcurator).toBeInstanceOf(ZIndexCalcurator);
  });

  it("ピンどめしたidは", () => {
    const newZ = zIndexCalcurator.setPin("id1");
    expect(newZ.pinnedId).toBe("id1");
  });

  it("指定したidをトップに移動することができる", () => {
    const newZ = zIndexCalcurator.moveToTop("id2");
    expect(newZ.ids).toEqual(["id1", "id3", "id2"]);
  });

  it("idが含まれているかどうか調べることができる。", () => {
    expect(zIndexCalcurator.includes("id1")).toBe(true);
    expect(zIndexCalcurator.includes("id4")).toBe(false);
  });

  it("z-indexの値を調べることができる", () => {
    expect(zIndexCalcurator.get("id2")).toBe(1);
  });

  it("idがトップかどうかを調べることができる。", () => {
    expect(zIndexCalcurator.isTop("id1")).toBe(false);
    expect(zIndexCalcurator.isTop("id3")).toBe(true);
  });

  it("普通の（ピン留めしてない）z-indexのうち最も大きいものを知ることができる", () => {
    expect(zIndexCalcurator.maxNormalZIndex).toBe(2);
  });

  it("ピン留めを考慮して、最も大きいz-indexを知ることができる。", () => {
    console.log(zIndexCalcurator.pinnedId);

    expect(zIndexCalcurator.maxTopZIndex).toBe(2);
  });

  it("登録されているidの数を知ることができる", () => {
    expect(zIndexCalcurator.size).toBe(3);
  });

  it("最も大きいz-indexを知ることができる。", () => {
    expect(zIndexCalcurator.max).toBe(2);
  });
});
