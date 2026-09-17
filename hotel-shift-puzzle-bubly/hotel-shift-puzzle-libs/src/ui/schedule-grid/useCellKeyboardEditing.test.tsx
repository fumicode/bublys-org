import type { KeyboardEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  Staff,
  WorkingDay,
  createDefaultWorkShifts,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  useCellKeyboardEditing,
  type ApproveDirection,
} from "./useCellKeyboardEditing.js";

/**
 * 勤務表のカーソル移動は Excel に準拠する（#152）。ルールは3つ:
 *   1. 打って入力した値は、押したキーの向きへ動いて確定する
 *   2. リストから選んだ値は、その場に留まって確定する
 *   3. 何も入力していないときの Enter / Tab は移動。確定提案があれば承認してその向きの次の提案へ
 */
describe("useCellKeyboardEditing（Excel 準拠のカーソル移動）", () => {
  const staffList = ["s1", "s2", "s3"].map((id) => new Staff({ id, name: id }));
  const days = [1, 2, 3].map((d) => WorkingDay.of(2026, 6, d));
  const shiftOptions = createDefaultWorkShifts(); // 早番 7時 / 中番 9時 / 遅番 13時

  const setUp = (opts: {
    forcedCellOf?: (staffId: string, day: WorkingDay) => ShiftCell | undefined;
    onApproveForced?: (
      staffId: string,
      day: WorkingDay,
      cell: ShiftCell,
      direction: ApproveDirection
    ) => boolean;
    requiredShiftNames?: string[];
    maxRequired?: number;
    onChangeRequiredCell?: (shiftName: string, day: WorkingDay | null, count: number) => void;
    onOpenRequiredList?: (shiftName: string, day: WorkingDay | null) => void;
  } = {}) => {
    const onChangeCell = jest.fn();
    const hook = renderHook(() =>
      useCellKeyboardEditing({ staffList, days, shiftOptions, onChangeCell, ...opts })
    );
    // 真ん中のセル（s2 × 2日）から始める。上下左右どちらにも動ける
    act(() => hook.result.current.selectCell("s2", days[1]));

    const press = (key: string, mods: { shiftKey?: boolean; altKey?: boolean } = {}) => {
      const preventDefault = jest.fn();
      const event = {
        key,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        ctrlKey: false,
        ...mods,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLDivElement>;
      act(() => hook.result.current.handleKeyDown(event));
      return preventDefault;
    };
    const at = () => {
      const selection = hook.result.current.selection;
      if (!selection) return null;
      if (selection.kind === "staff") return `${selection.staffId}:${selection.day.day}`;
      return `${selection.shiftName}:${selection.day?.day ?? "全日"}`;
    };
    return { hook, onChangeCell, press, at };
  };

  const early: ShiftCell = { kind: "work", shiftId: "early" };

  describe("★ ルール1：打って入力した値は、押したキーの向きへ動いて確定する", () => {
    it.each([
      ["Enter", {}, "s3:2"],
      ["Enter", { shiftKey: true }, "s1:2"],
      ["Tab", {}, "s2:3"],
      ["Tab", { shiftKey: true }, "s2:1"],
      ["ArrowRight", {}, "s2:3"],
      ["ArrowLeft", {}, "s2:1"],
      ["ArrowDown", {}, "s3:2"],
      ["ArrowUp", {}, "s1:2"],
    ])("「7」→ %s %j で早番に確定して %s へ", (key, mods, expected) => {
      const { hook, onChangeCell, press, at } = setUp();
      press("7");
      expect(hook.result.current.editMode).toBe("type");

      const preventDefault = press(key, mods);

      expect(onChangeCell).toHaveBeenCalledWith("s2", days[1], early);
      expect(at()).toBe(expected);
      expect(hook.result.current.editing).toBe(false);
      expect(preventDefault).toHaveBeenCalled(); // Tab でもフォーカスを外へ逃がさない
    });

    it("候補に当たらない文字のまま Enter → 何も書かずに下へ", () => {
      const { onChangeCell, press, at } = setUp();
      press("8");
      press("8");

      press("Enter");

      expect(onChangeCell).not.toHaveBeenCalled();
      expect(at()).toBe("s3:2");
    });

    it("Esc は打ち込みを取り消して、動かない", () => {
      const { hook, onChangeCell, press, at } = setUp();
      press("7");

      press("Escape");

      expect(onChangeCell).not.toHaveBeenCalled();
      expect(at()).toBe("s2:2");
      expect(hook.result.current.editing).toBe(false);
    });
  });

  describe("★ ルール2：リストから選んだ値は、その場に留まって確定する", () => {
    it.each([
      ["Alt+↓", "ArrowDown", { altKey: true }],
      ["F2", "F2", {}],
    ])("%s で開き、↓ で中番を選んで Enter → 確定して動かない", (_label, key, mods) => {
      const { hook, onChangeCell, press, at } = setUp();
      press(key, mods);
      expect(hook.result.current.editMode).toBe("list");

      press("ArrowDown"); // 早番 → 中番
      press("Enter");

      expect(onChangeCell).toHaveBeenCalledWith("s2", days[1], { kind: "work", shiftId: "middle" });
      expect(at()).toBe("s2:2");
      expect(hook.result.current.editing).toBe(false);
    });

    it("ダブルクリック（openEditor）で開いても同じ", () => {
      const { hook, press, at } = setUp();
      act(() => hook.result.current.openEditor("s1", days[0]));
      expect(hook.result.current.editMode).toBe("list");

      press("Enter");

      expect(at()).toBe("s1:1");
    });

    it("候補のクリック（applySuggestion）は、打つ入力の途中でも動かない", () => {
      const { hook, onChangeCell, press, at } = setUp();
      press("7");

      act(() => hook.result.current.applySuggestion(hook.result.current.suggestions[0]));

      expect(onChangeCell).toHaveBeenCalledWith("s2", days[1], early);
      expect(at()).toBe("s2:2");
    });

    it("リストで ←→ / Tab を押すと、確定せずに閉じてその向きへ動く", () => {
      const { onChangeCell, press, at } = setUp();
      press("F2");

      press("Tab");

      expect(onChangeCell).not.toHaveBeenCalled();
      expect(at()).toBe("s2:3");
    });
  });

  describe("★ ルール3：何も入力していないときの Enter / Tab", () => {
    it.each([
      ["Enter", {}, "s3:2"],
      ["Enter", { shiftKey: true }, "s1:2"],
      ["Tab", {}, "s2:3"],
      ["Tab", { shiftKey: true }, "s2:1"],
    ])("確定提案が無ければ %s %j で %s へ動くだけ", (key, mods, expected) => {
      const { onChangeCell, press, at } = setUp();

      const preventDefault = press(key, mods);

      expect(at()).toBe(expected);
      expect(onChangeCell).not.toHaveBeenCalled();
      expect(preventDefault).toHaveBeenCalled();
    });

    it.each([
      ["Enter", "down"],
      ["Tab", "right"],
    ])("確定提案があれば %s で承認し、%s 方向の次の提案を探してもらう", (key, direction) => {
      const onApproveForced = jest.fn(() => true);
      const { press, at } = setUp({ forcedCellOf: () => early, onApproveForced });

      press(key);

      expect(onApproveForced).toHaveBeenCalledWith("s2", days[1], early, direction);
      // 次の提案へ移すのは呼び出し側（true を返した）。ここでは動かさない
      expect(at()).toBe("s2:2");
    });

    it("次の提案が無ければ（false）、その向きへ1マス動く", () => {
      const { press, at } = setUp({ forcedCellOf: () => early, onApproveForced: () => false });

      press("Enter");

      expect(at()).toBe("s3:2");
    });

    it("Shift+Enter / Shift+Tab は承認しない（戻るだけ）", () => {
      const onApproveForced = jest.fn(() => true);
      const { press, at } = setUp({ forcedCellOf: () => early, onApproveForced });

      press("Tab", { shiftKey: true });

      expect(onApproveForced).not.toHaveBeenCalled();
      expect(at()).toBe("s2:1");
    });
  });

  it("端のセルではその向きに動かず留まる", () => {
    const { hook, press, at } = setUp();
    act(() => hook.result.current.selectCell("s3", days[2]));

    press("Enter");
    press("Tab");

    expect(at()).toBe("s3:3");
  });

  it("Delete でセルを未定に戻す", () => {
    const { onChangeCell, press } = setUp();

    press("Delete");

    expect(onChangeCell).toHaveBeenCalledWith("s2", days[1], { kind: "undecided" });
  });

  /**
   * 必要人数のセル（#156）。カーソルは1つで、表はひと続き（スタッフ行の下に必要人数の行）。
   * キー操作は #152 のルールをそのまま使う。
   */
  describe("必要人数のセル", () => {
    const requiredSetUp = () => {
      const onChangeRequiredCell = jest.fn();
      const onOpenRequiredList = jest.fn();
      const ctx = setUp({
        requiredShiftNames: ["早番", "遅番"],
        maxRequired: 3,
        onChangeRequiredCell,
        onOpenRequiredList,
      });
      return { ...ctx, onChangeRequiredCell, onOpenRequiredList };
    };

    it("★ 一番下のスタッフ行から ↓ で必要人数の行へ入り、↑ で戻る", () => {
      const { hook, press, at } = requiredSetUp();
      act(() => hook.result.current.selectCell("s3", days[1]));

      press("ArrowDown");
      expect(at()).toBe("早番:2");

      press("ArrowUp");
      expect(at()).toBe("s3:2");
    });

    it("★ 「3」→ Enter で必要人数を3にして、下の勤務帯行へ", () => {
      const { hook, press, at, onChangeRequiredCell, onChangeCell } = requiredSetUp();
      act(() => hook.result.current.selectRequired("早番", days[2]));

      press("3");
      expect(hook.result.current.editMode).toBe("type");
      expect(hook.result.current.suggestions).toEqual([]); // 勤務帯の候補リストは出さない
      press("Enter");

      expect(onChangeRequiredCell).toHaveBeenCalledWith("早番", days[2], 3);
      expect(onChangeCell).not.toHaveBeenCalled();
      expect(at()).toBe("遅番:3");
    });

    it("★ 行の見出しで「2」→ Tab で全日まとめて2にして、1日目へ", () => {
      const { hook, press, at, onChangeRequiredCell } = requiredSetUp();
      act(() => hook.result.current.selectRequired("遅番", null));

      press("2");
      press("Tab");

      expect(onChangeRequiredCell).toHaveBeenCalledWith("遅番", null, 2);
      expect(at()).toBe("遅番:1");
    });

    it("1日目から ← で行の見出しへ", () => {
      const { hook, press, at } = requiredSetUp();
      act(() => hook.result.current.selectRequired("早番", days[0]));

      press("ArrowLeft");

      expect(at()).toBe("早番:全日");
    });

    it("最大値を超える数は入れずに動く（打ち込み途中の数字も同じ扱い）", () => {
      const { hook, press, at, onChangeRequiredCell } = requiredSetUp();
      act(() => hook.result.current.selectRequired("早番", days[0]));

      press("1");
      press("2"); // 12 > 最大 3
      press("ArrowRight");

      expect(onChangeRequiredCell).not.toHaveBeenCalled();
      expect(at()).toBe("早番:2");
    });

    it("何も打たずに Enter / Tab は移動だけ", () => {
      const { hook, press, at, onChangeRequiredCell } = requiredSetUp();
      act(() => hook.result.current.selectRequired("早番", days[0]));

      press("Enter");
      press("Tab");

      expect(onChangeRequiredCell).not.toHaveBeenCalled();
      expect(at()).toBe("遅番:2");
    });

    it.each([
      ["Alt+↓", "ArrowDown", { altKey: true }],
      ["F2", "F2", {}],
    ])("%s でメニューを開く（選ぶのはビューのメニュー。カーソルは動かない）", (_label, key, mods) => {
      const { hook, press, at, onOpenRequiredList } = requiredSetUp();
      act(() => hook.result.current.selectRequired("早番", days[1]));

      press(key, mods);

      expect(onOpenRequiredList).toHaveBeenCalledWith("早番", days[1]);
      expect(at()).toBe("早番:2");
    });

    it("Delete で 0（設定なし）にする", () => {
      const { hook, press, onChangeRequiredCell } = requiredSetUp();
      act(() => hook.result.current.selectRequired("遅番", days[1]));

      press("Delete");

      expect(onChangeRequiredCell).toHaveBeenCalledWith("遅番", days[1], 0);
    });

    it("Esc は打ち込みを取り消して、動かない", () => {
      const { hook, press, at, onChangeRequiredCell } = requiredSetUp();
      act(() => hook.result.current.selectRequired("早番", days[1]));

      press("2");
      press("Escape");

      expect(onChangeRequiredCell).not.toHaveBeenCalled();
      expect(at()).toBe("早番:2");
      expect(hook.result.current.editing).toBe(false);
    });

    it("必要人数の行を渡さなければ（抽出ビュー）、一番下のスタッフ行で ↓ しても留まる", () => {
      const { hook, press, at } = setUp();
      act(() => hook.result.current.selectCell("s3", days[1]));

      press("ArrowDown");

      expect(at()).toBe("s3:2");
    });
  });
});
