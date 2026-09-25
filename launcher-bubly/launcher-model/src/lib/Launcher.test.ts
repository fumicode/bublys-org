import { Launcher } from "./Launcher.js";

describe("Launcher", () => {
  it("create() は url の並びから entry を作り、各 entry に id を振る", () => {
    const l = Launcher.create(["memo-bubly", "users-bubly"], "main");
    expect(l.id).toBe("main");
    expect(l.urls).toEqual(["memo-bubly", "users-bubly"]);
    expect(new Set(l.entries.map((e) => e.id)).size).toBe(2);
  });

  it("add() は末尾、index 指定でその位置。新しいインスタンスを返す", () => {
    const l0 = Launcher.create(["a", "b"]);
    const l1 = l0.add("c");
    expect(l1.urls).toEqual(["a", "b", "c"]);
    expect(l0.urls).toEqual(["a", "b"]);
    expect(l0.add("c", 0).urls).toEqual(["c", "a", "b"]);
    expect(l0.add("c", 99).urls).toEqual(["a", "b", "c"]);
  });

  it("remove() は entry を消す。居なければ同じインスタンス", () => {
    const l = Launcher.create(["a", "b"]);
    const [a] = l.entries;
    expect(l.remove(a.id).urls).toEqual(["b"]);
    expect(l.remove("nope")).toBe(l);
  });

  it("move() で並び替え", () => {
    const l = Launcher.create(["a", "b", "c"]);
    const [a, , c] = l.entries;
    expect(l.move(c.id, 0).urls).toEqual(["c", "a", "b"]);
    expect(l.move(a.id, 2).urls).toEqual(["b", "c", "a"]);
    expect(l.move("nope", 0)).toBe(l);
  });

  it("split() は指定した entry を抜いて新しいランチャーにする。entry の id は引き継ぐ", () => {
    const l = Launcher.create(["a", "b", "c"]);
    const [a, b, c] = l.entries;
    const [rest, taken] = l.split([a.id, c.id], "new");
    expect(rest.id).toBe(l.id);
    expect(rest.urls).toEqual(["b"]);
    expect(rest.entries[0].id).toBe(b.id);
    expect(taken.id).toBe("new");
    expect(taken.urls).toEqual(["a", "c"]);
    expect(taken.entries.map((e) => e.id)).toEqual([a.id, c.id]);
  });

  it("merge() は相手の entry を取り込む。id は引き継ぐ", () => {
    const l = Launcher.create(["a"]);
    const other = Launcher.create(["x", "y"]);
    const merged = l.merge(other);
    expect(merged.urls).toEqual(["a", "x", "y"]);
    expect(merged.entries.slice(1).map((e) => e.id)).toEqual(other.entries.map((e) => e.id));
    expect(l.merge(other, 0).urls).toEqual(["x", "y", "a"]);
  });

  it("split → merge で元に戻る", () => {
    const l = Launcher.create(["a", "b", "c"]);
    const [rest, taken] = l.split([l.entries[1].id]);
    expect(rest.merge(taken, 1).toPlain()).toEqual(l.toPlain());
  });

  it("toPlain() → fromPlain() で往復する", () => {
    const l = Launcher.create(["a", "b"], "main");
    expect(Launcher.fromPlain(l.toPlain()).toPlain()).toEqual(l.toPlain());
  });

  it("isEmpty", () => {
    expect(Launcher.create([]).isEmpty).toBe(true);
    expect(Launcher.create(["a"]).isEmpty).toBe(false);
  });


  it("呼び出し先を差し替えても、並び順と entry の id は変わらない", () => {
    const l = Launcher.create(["memo-bubly", "users-bubly"], "main");
    const ids = l.entries.map((e) => e.id);
    const renamed = l.rename("memo-bubly", "memos");
    expect(renamed.urls).toEqual(["memos", "users-bubly"]);
    expect(renamed.entries.map((e) => e.id)).toEqual(ids);
  });

  it("無い呼び出し先を差し替えても何も起きない", () => {
    const l = Launcher.create(["users"], "main");
    expect(l.rename("memo-bubly", "memos")).toBe(l);
  });
});
