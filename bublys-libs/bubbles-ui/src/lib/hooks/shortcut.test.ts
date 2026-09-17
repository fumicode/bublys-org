/**
 * @jest-environment jsdom
 */
import {
  isTextEditingTarget,
  matchesShortcut,
  parseShortcut,
  type ShortcutEventLike,
} from "./shortcut.js";

const press = (key: string, mods: Partial<ShortcutEventLike> = {}): ShortcutEventLike => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("shortcut（Windows / Mac 共通のショートカット表記）", () => {
  it("★ mod+z は Ctrl+Z にも Cmd+Z にも当たり、Shift 付きには当たらない", () => {
    const undo = parseShortcut("mod+z");
    expect(matchesShortcut(press("z", { ctrlKey: true }), undo)).toBe(true);
    expect(matchesShortcut(press("z", { metaKey: true }), undo)).toBe(true);
    expect(matchesShortcut(press("Z", { ctrlKey: true, shiftKey: true }), undo)).toBe(false);
    expect(matchesShortcut(press("z"), undo)).toBe(false);
  });

  it("★ mod+shift+z は Shift 付き（e.key が大文字の Z）に当たる", () => {
    const redo = parseShortcut("mod+shift+z");
    expect(matchesShortcut(press("Z", { metaKey: true, shiftKey: true }), redo)).toBe(true);
    expect(matchesShortcut(press("Z", { ctrlKey: true, shiftKey: true }), redo)).toBe(true);
    expect(matchesShortcut(press("z", { ctrlKey: true }), redo)).toBe(false);
  });

  it("修飾無しのキーは、修飾付きで押されたら当たらない", () => {
    const left = parseShortcut("ArrowLeft");
    expect(left).toEqual({ key: "arrowleft", mod: false, shift: false, alt: false });
    expect(matchesShortcut(press("ArrowLeft"), left)).toBe(true);
    expect(matchesShortcut(press("ArrowLeft", { ctrlKey: true }), left)).toBe(false);
    expect(matchesShortcut(press("ArrowLeft", { altKey: true }), left)).toBe(false);
  });

  it("書き間違い（知らない修飾・キー無し）は例外", () => {
    expect(() => parseShortcut("cmd+z")).toThrow(/修飾/);
    expect(() => parseShortcut("mod+")).toThrow(/キー/);
  });

  it("テキストを打っている最中の要素（input / textarea / data-text-editing の内側）", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const grid = document.createElement("div");
    grid.setAttribute("data-text-editing", "");
    const cell = document.createElement("span");
    grid.appendChild(cell);
    const plain = document.createElement("div");

    expect(isTextEditingTarget(input)).toBe(true);
    expect(isTextEditingTarget(textarea)).toBe(true);
    expect(isTextEditingTarget(grid)).toBe(true);
    expect(isTextEditingTarget(cell)).toBe(true);
    expect(isTextEditingTarget(plain)).toBe(false);
    expect(isTextEditingTarget(null)).toBe(false);
  });
});
