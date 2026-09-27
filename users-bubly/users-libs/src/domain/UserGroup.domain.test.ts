/**
 * **グループ** ── 人の並び。押さえるのは 2 つ。
 *
 * > **触っても元は変わらない**（新しいものが返る）。
 * > **並びには意味がある** ── 入れた順に並び、並べ替えられる。
 *
 * ★ 変わらないときは**同じものが返る**（足しても減っても何も起きない場合）。
 *   新しいものを返すと、見ている側は「変わった」と思って描き直す。
 */
import { UserGroup } from "./UserGroup.domain.js";

const 組 = () => new UserGroup("g1", "設計班", ["u1", "u2"]);

describe("UserGroup", () => {
  test("入れると、末尾に付く。元の組は変わらない", () => {
    const before = 組();
    const after = before.joinMember("u3");
    expect(after.userIds).toEqual(["u1", "u2", "u3"]);
    expect(before.userIds).toEqual(["u1", "u2"]);
  });

  test("もう居る人を入れても、何も起きない（同じものが返る）", () => {
    const before = 組();
    expect(before.joinMember("u1")).toBe(before);
  });

  test("外すと、その人だけ抜ける。元の組は変わらない", () => {
    const before = 組();
    const after = before.removeMember("u1");
    expect(after.userIds).toEqual(["u2"]);
    expect(before.userIds).toEqual(["u1", "u2"]);
  });

  test("居ない人を外しても、何も起きない（同じものが返る）", () => {
    const before = 組();
    expect(before.removeMember("居ない")).toBe(before);
  });

  test("並べ替えは、言われた順を前に、残りは後ろにそのまま", () => {
    const g = new UserGroup("g1", "設計班", ["u1", "u2", "u3"]);
    expect(g.reorderMembers(["u3"]).userIds).toEqual(["u3", "u1", "u2"]);
  });

  test("並べ替えで、知らない人は混ぜず、同じ人は 1 度きり", () => {
    const g = 組();
    expect(g.reorderMembers(["u2", "u2", "居ない"]).userIds).toEqual(["u2", "u1"]);
  });

  test("名前を変えても、人の並びはそのまま", () => {
    const after = 組().rename("実装班");
    expect(after.name).toBe("実装班");
    expect(after.userIds).toEqual(["u1", "u2"]);
  });

  test("記録する形（toJSON）は、持っているものをそのまま", () => {
    expect(組().toJSON()).toEqual({ id: "g1", name: "設計班", userIds: ["u1", "u2"] });
  });
});
