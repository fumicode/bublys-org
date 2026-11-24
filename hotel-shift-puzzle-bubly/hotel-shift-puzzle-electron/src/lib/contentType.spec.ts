import { contentTypeOf } from "./contentType.js";

describe("contentTypeOf", () => {
  it("モジュールスクリプトと Worker は JavaScript として返す", () => {
    expect(contentTypeOf("/r/assets/index-abc.js")).toMatch(/^text\/javascript/);
    expect(contentTypeOf("/r/assets/candidates.worker-x.JS")).toMatch(/^text\/javascript/);
  });

  it("入口は HTML", () => {
    expect(contentTypeOf("/r/index.html")).toMatch(/^text\/html/);
  });

  it("知らない拡張子はただのバイト列", () => {
    expect(contentTypeOf("/r/data.bin")).toBe("application/octet-stream");
  });
});
