import { isAllowedRequest } from "./networkPolicy.js";

describe("isAllowedRequest", () => {
  it.each([
    "app://shiftonton/",
    "app://shiftonton/assets/index.js",
    "blob:app://shiftonton/1234",
    "data:text/plain,hi",
    "devtools://devtools/bundled/inspector.html",
  ])("アプリの中で完結するものは通す: %s", (url) => {
    expect(isAllowedRequest(url)).toBe(true);
  });

  it.each([
    "https://example.com/",
    "http://localhost:4006/",
    "wss://example.com/socket",
    "file:///C:/Windows/win.ini",
    "not a url",
  ])("外へ出るものは止める: %s", (url) => {
    expect(isAllowedRequest(url)).toBe(false);
  });
});
