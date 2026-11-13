import path from "node:path";
import { resolveAppFile } from "./resolveAppFile.js";

const root = path.resolve("/renderer");
const files = new Set([
  path.join(root, "index.html"),
  path.join(root, "assets", "index-abc.js"),
  path.join(root, "assets", "名前 付き.js"),
]);
const isFile = (p: string) => files.has(p);
const resolve = (url: string) => resolveAppFile(url, root, isFile);

describe("resolveAppFile", () => {
  it("在るファイルはそのまま返す", () => {
    expect(resolve("app://shiftonton/assets/index-abc.js")).toBe(
      path.join(root, "assets", "index-abc.js"),
    );
  });

  it("入口（/）は index.html", () => {
    expect(resolve("app://shiftonton/")).toBe(path.join(root, "index.html"));
  });

  it("知らないパス（バブルの並びの URL）は index.html に落とす", () => {
    expect(resolve("app://shiftonton/universe-abc123?x=1#y")).toBe(path.join(root, "index.html"));
  });

  it("エンコードされた名前も読む", () => {
    expect(resolve(`app://shiftonton/assets/${encodeURIComponent("名前 付き.js")}`)).toBe(
      path.join(root, "assets", "名前 付き.js"),
    );
  });

  it("画面のフォルダの外へは出さない", () => {
    files.add(path.resolve("/secret.txt"));
    expect(resolve("app://shiftonton/../secret.txt")).toBe(path.join(root, "index.html"));
    expect(resolve("app://shiftonton/%2E%2E/secret.txt")).toBe(path.join(root, "index.html"));
    expect(resolve("app://shiftonton/assets/..%2F..%2Fsecret.txt")).toBe(
      path.join(root, "index.html"),
    );
  });
});
