/**
 * **ユーザー** ── 名前と誕生日を持つだけの小さなもの。押さえるのは 1 つ。
 *
 * > **歳は、誕生日が来たかどうかで決まる。**
 *
 * ★ **「今日」を渡して数える。** 既定は本当の今日なので、そのまま見ると
 *   走らせる日によって答えが変わる ── テストは日付を渡す側で書く。
 */
import { User } from "./User.domain.js";

/** 2000-06-15 生まれ */
const 太郎 = () => new User("u1", "田中 太郎", "2000-06-15");

describe("User", () => {
  test("渡したものが、そのまま読める", () => {
    const u = 太郎();
    expect(u.id).toBe("u1");
    expect(u.name).toBe("田中 太郎");
    expect(u.birthday).toBe("2000-06-15");
    expect(u.toJSON()).toEqual({ id: "u1", name: "田中 太郎", birthday: "2000-06-15" });
  });

  test("誕生日を過ぎていれば、その年のぶん歳を取る", () => {
    expect(太郎().getAge(new Date("2020-06-16"))).toBe(20);
    expect(太郎().getAge(new Date("2020-12-31"))).toBe(20);
  });

  test("誕生日の当日に歳を取る", () => {
    expect(太郎().getAge(new Date("2020-06-15"))).toBe(20);
  });

  test("誕生日がまだなら、1 つ手前のまま", () => {
    // 月がまだ来ていない／月は同じでも日がまだ来ていない、の両方
    expect(太郎().getAge(new Date("2020-05-31"))).toBe(19);
    expect(太郎().getAge(new Date("2020-06-14"))).toBe(19);
  });

  test("生まれた年は 0 歳", () => {
    expect(太郎().getAge(new Date("2000-06-15"))).toBe(0);
    expect(太郎().getAge(new Date("2000-06-14"))).toBe(-1); // 生まれる前は負になる（そういう作り）
  });
});
