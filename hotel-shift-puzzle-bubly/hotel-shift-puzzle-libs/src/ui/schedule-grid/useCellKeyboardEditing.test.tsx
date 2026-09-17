import { useState, type KeyboardEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  Staff,
  WorkingDay,
  WorkingStaffGroup,
  WorkingStaffMember,
  createDefaultWorkShifts,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import type { CellSelection } from "./types.js";
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
    staffGroup?: WorkingStaffGroup;
  } = {}) => {
    const { onChangeRequiredCell, ...rest } = opts;
    // 1回の操作で渡る変更（範囲なら全セルぶん）。1セルずつ見る既存のテストは onChangeCell で読む
    const onChangeCells = jest.fn();
    const onChangeCell = jest.fn();
    const onChangeRequiredCells = jest.fn();
    // feature 層と同じく、カーソルは外側の state が持つ（制御値）。setOutside で外から動かせる
    const hook = renderHook(() => {
      const [selection, setOutside] = useState<CellSelection | null>(null);
      const kb = useCellKeyboardEditing({
        staffList,
        days,
        shiftOptions,
        selection,
        onSelectionChange: setOutside,
        onChangeCells: (changes) => {
          onChangeCells(changes);
          for (const c of changes) onChangeCell(c.staffId, c.day, c.to);
        },
        onChangeRequiredCells: (changes) => {
          onChangeRequiredCells(changes);
          for (const c of changes) onChangeRequiredCell?.(c.shiftName, c.day, c.count);
        },
        ...rest,
      });
      return { ...kb, setOutside };
    });
    // 真ん中のセル（s2 × 2日）から始める。上下左右どちらにも動ける
    act(() => hook.result.current.selectCell("s2", days[1]));

    const press = (
      key: string,
      mods: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean } = {}
    ) => {
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
    /** 選択中の全セル（範囲なら範囲ぜんぶ）を「s1:2」の形で並べる */
    const inRange = () =>
      staffList.flatMap((staff) =>
        days
          .filter((day) =>
            hook.result.current.isInRange({ kind: "staff", staffId: staff.id, day })
          )
          .map((day) => `${staff.id}:${day.day}`)
      );
    return { hook, onChangeCell, onChangeCells, onChangeRequiredCells, press, at, inRange };
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

  /**
   * 打っている途中の Ctrl/Cmd+Z は打ち込みの取り消し（#165）。打っていなければ素通しして、
   * 勤務表の世界線を戻すショートカット（useKeyBindings）に任せる。
   */
  describe("Ctrl/Cmd+Z", () => {
    it.each([
      ["Ctrl+Z", { ctrlKey: true }],
      ["Cmd+Z", { metaKey: true }],
    ])("★ 「7」を打っている途中の %s は、打ち込みを取り消して動かない", (_label, mods) => {
      const { hook, press, at, onChangeCells } = setUp();
      press("7");

      const preventDefault = press("z", mods);

      expect(onChangeCells).not.toHaveBeenCalled();
      expect(at()).toBe("s2:2");
      expect(hook.result.current.editing).toBe(false);
      expect(preventDefault).toHaveBeenCalled();
    });

    it("リストを開いている途中の Ctrl+Z も、閉じるだけ", () => {
      const { hook, press, onChangeCells } = setUp();
      press("F2");

      press("z", { ctrlKey: true });

      expect(onChangeCells).not.toHaveBeenCalled();
      expect(hook.result.current.editing).toBe(false);
    });

    it("打っていないときの Ctrl+Z は何もしない（世界線を戻すショートカットに任せる）", () => {
      const { hook, press, at, onChangeCells } = setUp();

      const preventDefault = press("z", { ctrlKey: true });

      expect(onChangeCells).not.toHaveBeenCalled();
      expect(at()).toBe("s2:2");
      expect(hook.result.current.editing).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  /**
   * 範囲選択（#157）。選択は「カーソル＋範囲の集まり」。
   * 入れる操作は選択の全セルへ1回で入り、範囲を残して留まる。範囲はカーソルが Shift 無しで動くと解ける。
   */
  describe("範囲選択", () => {
    const labels = (changes: { staffId: string; day: WorkingDay }[]) =>
      changes.map((c) => `${c.staffId}:${c.day.day}`);

    it("★ Shift＋→↓ で範囲を作り、「7」→ Enter で全セルに1回で入れて、範囲を残して留まる", () => {
      const { hook, press, at, inRange, onChangeCells } = setUp();
      press("ArrowRight", { shiftKey: true });
      press("ArrowDown", { shiftKey: true });
      expect(at()).toBe("s2:2"); // カーソルは起点のまま
      expect(inRange()).toEqual(["s2:2", "s2:3", "s3:2", "s3:3"]);

      press("7");
      press("Enter");

      expect(onChangeCells).toHaveBeenCalledTimes(1); // 1回の操作＝世界線の1ノード
      expect(labels(onChangeCells.mock.calls[0][0])).toEqual(["s2:2", "s2:3", "s3:2", "s3:3"]);
      expect(onChangeCells.mock.calls[0][0][0].to).toEqual(early);
      expect(at()).toBe("s2:2");
      expect(inRange()).toEqual(["s2:2", "s2:3", "s3:2", "s3:3"]);
      expect(hook.result.current.editing).toBe(false);
    });

    it("★ 早番に入れない人のセルだけ飛ばす（休みは誰にでも入る）", () => {
      const staffGroup = new WorkingStaffGroup({
        id: "g",
        members: [
          WorkingStaffMember.ofRoster("s1"),
          new WorkingStaffMember({ staffId: "s2", allowedShiftIds: ["late"] }),
          WorkingStaffMember.ofRoster("s3"),
        ],
      });
      const { press, onChangeCells } = setUp({ staffGroup });
      press("ArrowDown", { shiftKey: true }); // s2:2〜s3:2

      press("7");
      press("Enter");
      expect(labels(onChangeCells.mock.calls[0][0])).toEqual(["s3:2"]);

      press("Delete");
      expect(labels(onChangeCells.mock.calls[1][0])).toEqual(["s2:2", "s3:2"]);
    });

    it("範囲で候補リストを開くと、1人の可能勤務帯に絞らず勤務帯ぜんぶを出す", () => {
      const staffGroup = new WorkingStaffGroup({
        id: "g",
        members: ["s1", "s2", "s3"].map(
          (staffId) => new WorkingStaffMember({ staffId, allowedShiftIds: ["late"] })
        ),
      });
      const { hook, press } = setUp({ staffGroup });
      press("F2");
      const single = hook.result.current.suggestions.length;
      press("Escape");

      press("ArrowDown", { shiftKey: true });
      press("F2");
      expect(hook.result.current.suggestions.length).toBeGreaterThan(single);
    });

    it("Delete で範囲の全セルを未定に戻す", () => {
      const { press, onChangeCells } = setUp();
      press("ArrowLeft", { shiftKey: true });

      press("Delete");

      expect(onChangeCells).toHaveBeenCalledWith([
        { staffId: "s2", day: days[0], to: { kind: "undecided" } },
        { staffId: "s2", day: days[1], to: { kind: "undecided" } },
      ]);
    });

    it("Shift 無しの矢印で範囲が解け、カーソルから動く", () => {
      const { press, at, inRange } = setUp();
      press("ArrowRight", { shiftKey: true });

      press("ArrowDown");

      expect(at()).toBe("s3:2");
      expect(inRange()).toEqual([]);
    });

    it("範囲では確定提案を承認しない（Enter は範囲を解いて動く）", () => {
      const onApproveForced = jest.fn(() => true);
      const { press, at, inRange } = setUp({ forcedCellOf: () => early, onApproveForced });
      press("ArrowRight", { shiftKey: true });

      press("Enter");

      expect(onApproveForced).not.toHaveBeenCalled();
      expect(at()).toBe("s3:2");
      expect(inRange()).toEqual([]);
    });

    it("外からカーソルが動かされたら範囲は解ける（feature 層は範囲を知らなくてよい）", () => {
      const { hook, press, inRange } = setUp();
      press("ArrowRight", { shiftKey: true });

      act(() => hook.result.current.setOutside({ kind: "staff", staffId: "s1", day: days[0] }));

      expect(inRange()).toEqual([]);
    });

    it("マウス：Shift＋押すで起点から長方形、Ctrl/Cmd＋押すで飛び地を足す", () => {
      const { hook, at, inRange } = setUp();
      const cell = (staffId: string, d: number): CellSelection => ({
        kind: "staff",
        staffId,
        day: days[d - 1],
      });

      act(() => hook.result.current.pressCell(cell("s1", 1), { shiftKey: true, additive: false }));
      expect(inRange()).toEqual(["s1:1", "s1:2", "s2:1", "s2:2"]);
      expect(at()).toBe("s2:2");

      act(() => hook.result.current.pressCell(cell("s3", 3), { shiftKey: false, additive: true }));
      expect(inRange()).toEqual(["s1:1", "s1:2", "s2:1", "s2:2", "s3:3"]);
      expect(at()).toBe("s3:3"); // カーソルは足した飛び地へ

      act(() => hook.result.current.pressCell(cell("s1", 3), { shiftKey: false, additive: false }));
      expect(inRange()).toEqual([]);
      expect(at()).toBe("s1:3");
    });

    it("マウス：押したままドラッグで範囲を広げる。離したあとは広がらない", () => {
      const { hook, inRange } = setUp();
      const cell = (staffId: string, d: number): CellSelection => ({
        kind: "staff",
        staffId,
        day: days[d - 1],
      });

      act(() => hook.result.current.pressCell(cell("s1", 1), { shiftKey: false, additive: false }));
      act(() => hook.result.current.dragToCell(cell("s2", 3)));
      expect(inRange()).toEqual(["s1:1", "s1:2", "s1:3", "s2:1", "s2:2", "s2:3"]);

      act(() => {
        window.dispatchEvent(new MouseEvent("mouseup"));
      });
      act(() => hook.result.current.dragToCell(cell("s3", 3)));
      expect(inRange()).toEqual(["s1:1", "s1:2", "s1:3", "s2:1", "s2:2", "s2:3"]);
    });

    it("必要人数の範囲で「2」→ Enter で全セルに2を1回で入れる。スタッフ行へは広がらない", () => {
      const { hook, press, onChangeRequiredCells } = setUp({
        requiredShiftNames: ["早番", "遅番"],
        maxRequired: 3,
      });
      act(() => hook.result.current.selectRequired("早番", days[0]));
      press("ArrowUp", { shiftKey: true }); // スタッフ行へは出ない
      press("ArrowDown", { shiftKey: true });
      press("ArrowRight", { shiftKey: true });

      press("2");
      press("Enter");

      expect(onChangeRequiredCells).toHaveBeenCalledTimes(1);
      expect(
        onChangeRequiredCells.mock.calls[0][0].map(
          (c: { shiftName: string; day: WorkingDay; count: number }) =>
            `${c.shiftName}:${c.day.day}=${c.count}`
        )
      ).toEqual(["早番:1=2", "早番:2=2", "遅番:1=2", "遅番:2=2"]);
    });

    it("必要人数のメニューで選んだ数も、範囲の全セルに入れて留まる", () => {
      const { hook, press, at, onChangeRequiredCells } = setUp({
        requiredShiftNames: ["早番", "遅番"],
        maxRequired: 3,
      });
      act(() => hook.result.current.selectRequired("遅番", days[1]));
      press("ArrowRight", { shiftKey: true });

      let applied = false;
      act(() => {
        applied = hook.result.current.applyRequiredCount(1);
      });

      expect(applied).toBe(true);
      expect(onChangeRequiredCells).toHaveBeenCalledWith([
        { shiftName: "遅番", day: days[1], count: 1 },
        { shiftName: "遅番", day: days[2], count: 1 },
      ]);
      expect(at()).toBe("遅番:2");
    });
  });
});
