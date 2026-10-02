import { decideEdition } from "./edition";

describe("decideEdition", () => {
  it("何も憶えていない端末には訊かない", () => {
    expect(decideEdition(null, false, "v2")).toBe("fresh");
  });

  it("版を憶えていない（版を名乗る前から使っていた）端末には訊く", () => {
    expect(decideEdition(null, true, "v2")).toBe("ask");
  });

  it("前の版で使っていた端末には訊く", () => {
    expect(decideEdition("v1", true, "v2")).toBe("ask");
  });

  it("今の版を見たことがあれば、もう訊かない", () => {
    expect(decideEdition("v2", true, "v2")).toBe("current");
  });

  it("前の版を憶えていても、ほかに何も残っていなければ訊かない", () => {
    expect(decideEdition("v1", false, "v2")).toBe("fresh");
  });
});
