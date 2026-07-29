import { ResourceRef } from "./ResourceRef.js";

describe("ResourceRef", () => {
  it("employee / machine で種別付きに作れる", () => {
    expect(ResourceRef.employee("e1").key).toBe("employee:e1");
    expect(ResourceRef.machine("m1").key).toBe("machine:m1");
  });

  it("key と fromKey で往復できる（id にコロンがなければ）", () => {
    const r = ResourceRef.machine("m1");
    expect(ResourceRef.fromKey(r.key).equals(r)).toBe(true);
  });

  it("同じ id でも種別が違えば別物", () => {
    expect(ResourceRef.employee("x").equals(ResourceRef.machine("x"))).toBe(false);
  });

  it("isEmployee / isMachine", () => {
    expect(ResourceRef.employee("e1").isEmployee).toBe(true);
    expect(ResourceRef.machine("m1").isMachine).toBe(true);
  });
});
