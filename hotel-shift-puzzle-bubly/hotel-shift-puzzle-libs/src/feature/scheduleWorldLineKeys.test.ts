import { matchesShortcut, parseShortcut } from "@bublys-org/bubbles-ui";
import { scheduleUndoBindings } from "./scheduleWorldLineKeys.js";

/** useKeyBindings と同じ選び方（先頭から最初に当たった1つ）で押す */
const pressOn = (
  bindings: ReturnType<typeof scheduleUndoBindings>,
  e: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }
) => {
  const event = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...e };
  bindings.find((b) => matchesShortcut(event, parseShortcut(b.keys)))?.run();
};

describe("scheduleUndoBindings（勤務表の世界線を Ctrl/Cmd+Z で動かす）", () => {
  it.each([
    ["Ctrl+Z", { key: "z", ctrlKey: true }, "back"],
    ["Cmd+Z", { key: "z", metaKey: true }, "back"],
    ["Ctrl+Shift+Z", { key: "Z", ctrlKey: true, shiftKey: true }, "forward"],
    ["Cmd+Shift+Z", { key: "Z", metaKey: true, shiftKey: true }, "forward"],
  ])("★ %s → 世界線を1つ %s", (_label, e, expected) => {
    const scope = { moveBack: jest.fn(), moveForward: jest.fn() };

    pressOn(scheduleUndoBindings(scope), e);

    expect(scope.moveBack).toHaveBeenCalledTimes(expected === "back" ? 1 : 0);
    expect(scope.moveForward).toHaveBeenCalledTimes(expected === "forward" ? 1 : 0);
  });

  it("修飾キー無しの z では動かない", () => {
    const scope = { moveBack: jest.fn(), moveForward: jest.fn() };

    pressOn(scheduleUndoBindings(scope), { key: "z" });

    expect(scope.moveBack).not.toHaveBeenCalled();
    expect(scope.moveForward).not.toHaveBeenCalled();
  });
});
