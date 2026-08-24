import { planRibbons, type RibbonMember } from "./constraintRibbon.js";

/** covering/available の組み合わせを短く書くための補助 */
const covering: RibbonMember = { covering: true, available: false };
const free: RibbonMember = { covering: false, available: true }; // その日まだ未定
const fixed: RibbonMember = { covering: false, available: false }; // 休み／別の勤務帯で確定

const modesOf = (members: RibbonMember[], ctx: { satisfied: boolean; unfillable: boolean }) =>
  planRibbons(members, ctx).map((p) => p.mode);

describe("planRibbons", () => {
  it("入っている人は濃く、ほかは薄い（充足しているとき）", () => {
    expect(
      modesOf([covering, free, fixed], { satisfied: true, unfillable: false })
    ).toEqual(["solid", "faint", "faint"]);
  });

  it("未充足のとき、点滅するのは「まだ入れる人」だけ", () => {
    // 休みや別の勤務帯で確定している人に「誰か入って」と言っても仕方がない
    expect(
      modesOf([free, free, fixed], { satisfied: false, unfillable: false })
    ).toEqual(["blink", "blink", "faint"]);
  });

  it("入れる人が2人以上なら巡回点灯（順番と本数を振る）", () => {
    const plans = planRibbons([free, fixed, free], {
      satisfied: false,
      unfillable: false,
    });
    expect(plans.map((p) => p.mode)).toEqual(["blink", "faint", "blink"]);
    // 巡回は「入れる人の数」で回り、点灯順は詰めて振る
    expect(plans[0]).toMatchObject({ index: 0, count: 2 });
    expect(plans[2]).toMatchObject({ index: 1, count: 2 });
  });

  it("入れる人が1人に絞られたら、その人だけを静的に点灯する", () => {
    // 巡回する相手が居ないので点滅させない。制約バブルの図・アイコンと同じ見せ方。
    expect(
      modesOf([fixed, free, fixed], { satisfied: false, unfillable: false })
    ).toEqual(["faint", "only", "faint"]);
  });

  it("入っている人が居ても、まだ足りなければ残りの候補で判断する", () => {
    // minCount 2 で1人しか入っていない、のような状況
    expect(
      modesOf([covering, free, fixed], { satisfied: false, unfillable: false })
    ).toEqual(["solid", "only", "faint"]);
  });

  it("誰も入れない日は全員を警告（黄色・同時点滅）にする", () => {
    expect(
      modesOf([fixed, fixed], { satisfied: false, unfillable: true })
    ).toEqual(["sync", "sync"]);
  });
});
