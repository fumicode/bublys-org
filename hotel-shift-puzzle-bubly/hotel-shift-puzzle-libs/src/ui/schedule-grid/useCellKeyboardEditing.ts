import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  suggestShiftInputs,
  type WorkingStaffGroup,
  type ShiftCell,
  type ShiftSuggestion,
  type Staff,
  type WorkShift,
  type WorkingDay,
} from "../../domain/index.js";
import type {
  CellChange,
  CellClipboardHandlers,
  CellRef,
  CellSelection,
  RequiredChange,
  SelectionArea,
} from "./types.js";
import { moveCursor, type CursorLayout } from "./gridCursor.js";
import { matchesShortcut, parseShortcut } from "@bublys-org/bubbles-ui";
import {
  areaTo,
  cellsOf,
  extendArea,
  isInSelection,
  sameCell,
  singleArea,
} from "./gridSelection.js";

type UseCellKeyboardEditingParams = {
  /** 行の並び（上下移動の順序）。 */
  staffList: Staff[];
  /** 列の並び（左右移動の順序）。 */
  days: WorkingDay[];
  /** この勤務表で選べる勤務帯。 */
  shiftOptions: WorkShift[];
  /** あれば「選択スタッフが入れる勤務帯」に候補を絞る。 */
  staffGroup?: WorkingStaffGroup;
  /**
   * スタッフ行のセルの勤務割当を変更する（確定時に呼ぶ）。選択の全セルぶんを1回で渡す
   * （1回の操作＝世界線の1ノード）。入れられないセル（可能勤務帯に無い）は除いてある。
   */
  onChangeCells: (changes: CellChange[]) => void;
  /** feature 層と共有する制御選択。undefined のときだけ内部 state を使う。 */
  selection?: CellSelection | null;
  onSelectionChange?: (selection: CellSelection | null) => void;
  /** そのセルが制約から一意に決まるなら、その値（確定提案）。無ければ undefined。 */
  forcedCellOf?: (staffId: string, day: WorkingDay) => ShiftCell | undefined;
  /**
   * 確定提案を承認する（何も打っていないときの Enter＝"down" / Tab＝"right"）。
   * その向きの次の提案セルへ選択を移したら true を返す。false なら、その向きへ1マス動く。
   */
  onApproveForced?: (
    staffId: string,
    day: WorkingDay,
    cell: ShiftCell,
    direction: ApproveDirection
  ) => boolean;
  /**
   * 必要人数を入力できる勤務帯の行（勤務帯名。表示順）。スタッフ行の下に続けてカーソルが入る。
   * 渡さなければ（抽出ビュー）、カーソルはスタッフ行だけを動く。
   */
  requiredShiftNames?: string[];
  /** 必要人数として入れられる最大値（これを超えて打った数は入れない） */
  maxRequired?: number;
  /** 必要人数を確定する。選択の全セルぶんを1回で渡す。day が null なら全日まとめて（行の見出し） */
  onChangeRequiredCells?: (changes: RequiredChange[]) => void;
  /** 必要人数のメニュー（0〜最大値から選ぶ）を開く。day が null なら全日まとめて */
  onOpenRequiredList?: (shiftName: string, day: WorkingDay | null) => void;
  /** セルのコピー・カット・貼り付け（#166）。渡さなければ扱わない */
  clipboard?: CellClipboardHandlers;
};

/** 確定提案を承認したあと、次の提案を探す向き（Enter＝下 / Tab＝右） */
export type ApproveDirection = "right" | "down";

/**
 * 編集の状態。Excel と同じく「打って入力する」と「リストから選ぶ」を分ける。
 *   - type : 文字を打っている。Enter / Tab / 矢印で確定し、その向きへ動く
 *   - list : リストを開いて選んでいる（Alt+↓ / F2 / ダブルクリック）。↑↓で選び、確定しても動かない
 * 必要人数のセルのリスト（メニュー）はビューが持つので、ここでは type だけを使う。
 */
export type EditMode = "type" | "list";

export type CellKeyboardEditing = {
  /** キー入力を受けるグリッド要素の ref（tabIndex + onKeyDown を付ける先）。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** カーソル（無ければ null）。 */
  selection: CellSelection | null;
  /** 打ち込み中のバッファ。null は非入力（ドロップダウン閉）、"" 以上は入力中（開）。 */
  inputBuffer: string | null;
  /** 編集の状態（打つ入力／リスト選択）。閉じていれば null。 */
  editMode: EditMode | null;
  /** ドロップダウンを開いているか（editMode !== null）。 */
  editing: boolean;
  /** 現在の入力候補（前方一致）。スタッフ行のセルを編集しているときだけ。 */
  suggestions: ShiftSuggestion[];
  /** ハイライト中の候補インデックス（範囲内にクランプ済み）。 */
  activeIndex: number;
  /** 候補ドロップダウンのアンカー要素（選択中のスタッフ行のセルの DOM）。 */
  anchorEl: HTMLElement | null;
  /** スタッフ行のセルを選択（ドロップダウンは閉じる）。 */
  selectCell: (staffId: string, day: WorkingDay) => void;
  /** 必要人数のセル（day が null なら行の見出し）を選択する。 */
  selectRequired: (shiftName: string, day: WorkingDay | null) => void;
  /**
   * 必要人数のメニューで選んだ数を、選択中の必要人数のセルぜんぶに入れる（ルール2：留まる）。
   * 入れたセルが無ければ false
   */
  applyRequiredCount: (count: number) => boolean;
  /**
   * セルを押した（マウス）。修飾無し＝そのセルだけ、Shift＝起点からそこまでの範囲、
   * additive（Ctrl/Cmd）＝飛び地として足す。押したままのドラッグは dragToCell で範囲を広げる。
   */
  pressCell: (cell: CellSelection, mods: { shiftKey: boolean; additive: boolean }) => void;
  /** 押したまま入ったセルまで、最後の範囲を広げる（ドラッグ）。押していなければ何もしない */
  dragToCell: (cell: CellSelection) => void;
  /** セルが範囲選択に入っているか（2セル以上選んでいるときだけ true。1セルはカーソルの枠で足りる） */
  isInRange: (cell: CellSelection) => boolean;
  /** スタッフ行のセルを選択してリスト選択を開く（全候補表示。ダブルクリック）。 */
  openEditor: (staffId: string, day: WorkingDay) => void;
  /** リストから選んだ候補で確定する（クリック）。**動かない。** */
  applySuggestion: (s: ShiftSuggestion) => void;
  /** グリッドの onKeyDown ハンドラ。 */
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  /** グリッドの onCopy / onCut / onPaste ハンドラ（#166） */
  handleCopy: (e: ClipboardEvent<HTMLDivElement>) => void;
  handleCut: (e: ClipboardEvent<HTMLDivElement>) => void;
  handlePaste: (e: ClipboardEvent<HTMLDivElement>) => void;
};

/** 候補を勤務割当（ShiftCell）へ変換する。 */
const suggestionToCell = (s: ShiftSuggestion): ShiftCell => {
  if (s.kind === "work") return { kind: "work", shiftId: s.shift.id };
  if (s.kind === "day-off") return { kind: "day-off" };
  return { kind: "undecided" };
};

/** 打ち込みの取り消し（打っている途中の Ctrl/Cmd+Z。Excel と同じ） */
const CANCEL_TYPING = parseShortcut("mod+z");

/** オブジェクトとして貼る（#166）。値のみの Ctrl/Cmd+V はネイティブの paste イベントで受ける */
const PASTE_OBJECTS = parseShortcut("mod+shift+v");

/** 押したキーが指す向き（Enter↓ / Tab→ / 矢印。Shift で逆向き）。移動のキーでなければ null */
const directionOf = (e: KeyboardEvent<HTMLDivElement>): [number, number] | null => {
  switch (e.key) {
    case "ArrowUp":
      return [-1, 0];
    case "ArrowDown":
      return [1, 0];
    case "ArrowLeft":
      return [0, -1];
    case "ArrowRight":
      return [0, 1];
    case "Enter":
      return e.shiftKey ? [-1, 0] : [1, 0];
    case "Tab":
      return e.shiftKey ? [0, -1] : [0, 1];
    default:
      return null;
  }
};

const isTypedChar = (e: KeyboardEvent<HTMLDivElement>) =>
  e.key.length === 1 && /^[0-9a-zA-Z]$/.test(e.key);

const isDigit = (e: KeyboardEvent<HTMLDivElement>) => /^[0-9]$/.test(e.key);

/**
 * 勤務表グリッドのキーボード操作（セル選択・矢印移動・打ち込みでの確定）をまとめたフック。
 * 状態と対話ロジックをここに閉じ込め、ScheduleGridView は描画に徹する。
 *
 * **カーソルは1つ。** スタッフ行のセルと必要人数のセル（行の見出しを含む）は、同じカーソルの
 * 居場所の違いにすぎない（#156）。表はひと続きで、スタッフ行の下に必要人数の行が続く（gridCursor）。
 *
 * **選択は「カーソル＋範囲の集まり」**（#157）。範囲は Excel と同じ長方形（Shift＋矢印・Shift＋クリック・
 * ドラッグ）で、Ctrl/Cmd＋クリックで飛び地を足す。カーソルは最後の範囲の起点。
 *   - **入れる操作は選択の全セルに効く。** 打った値・リストで選んだ値・Delete を全セルへ1回で入れ、
 *     範囲を残して留まる。可能勤務帯に無い勤務帯は、その人のセルだけ飛ばす
 *   - **範囲は、カーソルが Shift 無しで動くと解ける。** 外から（feature 層が）カーソルを動かしても、
 *     最後の範囲の起点とずれるので解けたものとして扱う
 *
 * カーソル移動は Excel に準拠する（#152）。ルールは3つだけ:
 *   1. **打って入力した値は、押したキーの向きへ動いて確定する**
 *      （Enter↓ / Shift+Enter↑ / Tab→ / Shift+Tab← / 矢印はその向き）
 *   2. **リストから選んだ値は、その場に留まって確定する**（リストでの Enter・候補のクリック）
 *   3. **何も入力していないときの Enter / Tab は移動。** そのセルに確定提案（点線）があれば、
 *      承認してその向きの次の提案セルへ飛ぶ（次の提案を探すのは feature 層）
 *
 * スタッフ行のセル:
 *   - 選択だけ  : 矢印・Enter・Tab で移動 / Alt+↓・F2 でリストを開く / 英数字で打つ入力を開く /
 *                 Backspace・Delete で未定に戻す / Esc で選択を外す
 *   - 打つ入力  : 英数字・Backspace で打つ / Enter・Tab・矢印で先頭の候補で確定して動く /
 *                 Esc で取り消す（動かない）
 *   - リスト選択: ↑↓で候補を選ぶ / Enter で確定して留まる / 英数字・Backspace で絞る /
 *                 ←→・Tab で確定せずに閉じて動く / Esc で閉じる
 * 必要人数のセル:
 *   - 選択だけ  : 矢印・Enter・Tab で移動 / Alt+↓・F2 でメニューを開く / 数字で打つ入力を開く /
 *                 Backspace・Delete で 0（設定なし）/ Esc で選択を外す
 *   - 打つ入力  : 数字・Backspace で打つ / Enter・Tab・矢印で打った数で確定して動く
 *                 （0〜最大値の外なら変えずに動く）/ Esc で取り消す（動かない）
 */
export function useCellKeyboardEditing({
  staffList,
  days,
  shiftOptions,
  staffGroup,
  onChangeCells,
  selection: controlledSelection,
  onSelectionChange,
  forcedCellOf,
  onApproveForced,
  requiredShiftNames = [],
  maxRequired,
  onChangeRequiredCells,
  onOpenRequiredList,
  clipboard,
}: UseCellKeyboardEditingParams): CellKeyboardEditing {
  const gridRef = useRef<HTMLDivElement>(null);
  const [internalSelection, setInternalSelection] =
    useState<CellSelection | null>(null);
  const selection =
    controlledSelection === undefined
      ? internalSelection
      : controlledSelection;
  /** カーソルだけを動かす（範囲はそのまま。飛び地を足すとき） */
  const setCursor = (next: CellSelection | null) => {
    if (controlledSelection === undefined) setInternalSelection(next);
    onSelectionChange?.(next);
  };
  /** カーソルを置き直す。範囲は解ける */
  const setSelection = (next: CellSelection | null) => {
    setAreas([]);
    setCursor(next);
  };

  // ----- 範囲選択（#157）-----
  const layout: CursorLayout = {
    staffIds: staffList.map((s) => s.id),
    requiredShiftNames,
    days,
  };
  const [areas, setAreas] = useState<SelectionArea[]>([]);
  // 範囲はカーソルに重ねる。最後の範囲の起点がカーソルでなければ（外から動かされた）解けている
  const lastArea = areas[areas.length - 1];
  const activeAreas: SelectionArea[] = !selection
    ? []
    : lastArea && sameCell(lastArea.anchor, selection)
      ? areas
      : [singleArea(selection)];
  useEffect(() => {
    if (lastArea && !sameCell(lastArea.anchor, selection)) setAreas([]);
  }, [lastArea, selection]);
  /** 選択中の全セル（表の上から・左から順） */
  const targets = cellsOf(activeAreas, layout);
  const hasRange = targets.length > 1;
  /** 最後の範囲を置き換える（Shift で広げる・ドラッグ） */
  const replaceLastArea = (next: (last: SelectionArea) => SelectionArea) => {
    const last = activeAreas[activeAreas.length - 1];
    if (last) setAreas([...activeAreas.slice(0, -1), next(last)]);
  };
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // スタッフ行のセルにいるときだけの値（候補・アンカー）
  const staffSelection = selection?.kind === "staff" ? selection : null;

  // 選択中スタッフが入れる勤務帯だけに絞る（可能勤務帯があれば）
  // 範囲のときは勤務帯ぜんぶから出し、入れる段で人ごとに飛ばす（setStaffCells）
  const selectableShiftOptions =
    staffGroup && staffSelection && !hasRange
      ? shiftOptions.filter((w) => staffGroup.isAllowed(staffSelection.staffId, w.id))
      : shiftOptions;

  // 入力候補（前方一致）。スタッフ行のセルを編集しているときだけ出す
  const suggestions: ShiftSuggestion[] =
    staffSelection && inputBuffer !== null
      ? suggestShiftInputs(inputBuffer, selectableShiftOptions)
      : [];
  // 候補が減ったときに範囲外を指さないようクランプ
  const activeClamped = Math.min(activeIndex, Math.max(suggestions.length - 1, 0));

  // ドロップダウンのアンカー要素を、選択セルの DOM から data 属性で引く
  // （クリック選択・矢印移動どちらでも同じ経路で取れる）
  const selectionKey = staffSelection
    ? `${staffSelection.staffId}:${staffSelection.day.key}`
    : null;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!selectionKey || !gridRef.current) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(
      gridRef.current.querySelector<HTMLElement>(`[data-cell-key="${selectionKey}"]`)
    );
  }, [selectionKey]);

  const closeEditor = () => {
    setInputBuffer(null);
    setEditMode(null);
  };

  /** 編集を開く。type は打った1文字目から、list は全候補から始める */
  const beginEdit = (mode: EditMode, buffer: string) => {
    setEditMode(mode);
    setInputBuffer(buffer);
    setActiveIndex(0);
  };

  const selectCell = (staffId: string, day: WorkingDay) => {
    setSelection({ kind: "staff", staffId, day });
    closeEditor();
    gridRef.current?.focus();
  };

  const selectRequired = (shiftName: string, day: WorkingDay | null) => {
    setSelection({ kind: "required", shiftName, day });
    closeEditor();
    gridRef.current?.focus();
  };

  const openEditor = (staffId: string, day: WorkingDay) => {
    setSelection({ kind: "staff", staffId, day });
    beginEdit("list", "");
    gridRef.current?.focus();
  };

  // カーソルを dRow 行・dCol 列ぶん動かす（表はひと続き。端でクランプ）。編集中なら閉じる
  const moveSelection = (dRow: number, dCol: number) => {
    closeEditor();
    setSelection(
      moveCursor(selection, dRow, dCol, {
        staffIds: staffList.map((s) => s.id),
        requiredShiftNames,
        days,
      })
    );
  };

  /** 選択中のスタッフ行のセルぜんぶに入れる。その人が入れない勤務帯のセルは飛ばす */
  const setStaffCells = (to: ShiftCell) => {
    const changes: CellChange[] = [];
    for (const cell of targets) {
      if (cell.kind !== "staff") continue;
      if (to.kind === "work" && staffGroup && !staffGroup.isAllowed(cell.staffId, to.shiftId)) {
        continue;
      }
      changes.push({ staffId: cell.staffId, day: cell.day, to });
    }
    if (changes.length > 0) onChangeCells(changes);
  };

  /** 候補でスタッフ行のセル（範囲なら全セル）を確定して閉じる（動かない） */
  const commit = (s: ShiftSuggestion) => {
    if (staffSelection) setStaffCells(suggestionToCell(s));
    closeEditor();
  };

  // リストから選んだ（クリック）＝ルール2：確定して留まる
  const applySuggestion = (s: ShiftSuggestion) => {
    commit(s);
    gridRef.current?.focus();
  };

  // 打った値＝ルール1：先頭の候補で確定して、その向きへ動く。候補が無ければ変えずに動く。
  // 範囲なら全セルに入れて留まる（続けて上書き・Delete できる）
  const commitTypedAndMove = (dRow: number, dCol: number) => {
    if (suggestions.length > 0) commit(suggestions[activeClamped]);
    if (hasRange) closeEditor();
    else moveSelection(dRow, dCol);
  };

  // ----- マウス -----
  const draggingRef = useRef(false);
  useEffect(() => {
    const stop = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const pressCell = (cell: CellSelection, mods: { shiftKey: boolean; additive: boolean }) => {
    closeEditor();
    const last = activeAreas[activeAreas.length - 1];
    if (mods.shiftKey && last) {
      replaceLastArea(() => areaTo(last.anchor, cell, layout));
    } else if (mods.additive && selection && selection.kind === cell.kind) {
      setAreas([...activeAreas, singleArea(cell)]);
      setCursor(cell);
    } else {
      setSelection(cell);
    }
    draggingRef.current = true;
    gridRef.current?.focus();
  };

  const dragToCell = (cell: CellSelection) => {
    if (!draggingRef.current) return;
    const last = activeAreas[activeAreas.length - 1];
    if (!last) return;
    const next = areaTo(last.anchor, cell, layout);
    if (sameCell(next.extent, last.extent)) return;
    replaceLastArea(() => next);
  };

  const isInRange = (cell: CellSelection) => hasRange && isInSelection(activeAreas, cell, layout);

  const editing = editMode !== null;

  /** 打つ入力・リスト選択とも、Backspace は1文字消す。空でさらに消したら clearCell して閉じる */
  const backspaceInEditor = (clearCell: () => void) => {
    if (inputBuffer && inputBuffer.length > 0) {
      setInputBuffer(inputBuffer.slice(0, -1));
      setActiveIndex(0);
      return;
    }
    clearCell();
    closeEditor();
  };

  // ===== 必要人数のセル =====
  /**
   * 選択中の必要人数のセルぜんぶに入れる（カーソルが見出しなら、見出し＝全日まとめて）。
   * 入れたセルが無ければ（カーソルがスタッフ行）false
   */
  const setRequiredCount = (count: number): boolean => {
    const changes: RequiredChange[] = [];
    for (const cell of targets) {
      if (cell.kind === "required") {
        changes.push({ shiftName: cell.shiftName, day: cell.day, count });
      }
    }
    if (changes.length === 0) return false;
    onChangeRequiredCells?.(changes);
    return true;
  };

  const handleRequiredKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    cursor: Extract<CellSelection, { kind: "required" }>
  ) => {
    const setCount = (count: number) => setRequiredCount(count);

    // 打つ入力: 打った数で確定して、その向きへ動く（ルール1）
    if (editMode === "type") {
      const direction = directionOf(e);
      if (direction) {
        e.preventDefault();
        const count = Number(inputBuffer);
        const inRange =
          inputBuffer !== null &&
          inputBuffer !== "" &&
          Number.isInteger(count) &&
          count >= 0 &&
          (maxRequired === undefined || count <= maxRequired);
        if (inRange) setCount(count);
        if (hasRange) closeEditor(); // 範囲なら全セルに入れて留まる
        else moveSelection(...direction);
        return;
      }
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          closeEditor(); // 打ち込みを取り消す（動かない）
          return;
        case "Backspace":
          e.preventDefault();
          backspaceInEditor(() => setCount(0));
          return;
        default:
          if (isDigit(e)) {
            e.preventDefault();
            setInputBuffer((prev) => (prev ?? "") + e.key);
          }
          return;
      }
    }

    // 選択だけ
    const direction = directionOf(e);
    if (direction) {
      e.preventDefault();
      moveSelection(...direction); // 確定提案は無いので、Enter / Tab も移動だけ（ルール3）
      return;
    }
    switch (e.key) {
      case "F2":
        e.preventDefault();
        onOpenRequiredList?.(cursor.shiftName, cursor.day);
        return;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        setCount(0); // 設定なし
        return;
      case "Escape":
        e.preventDefault();
        setSelection(null);
        return;
      default:
        if (isDigit(e)) {
          e.preventDefault();
          beginEdit("type", e.key);
        }
    }
  };

  // ===== スタッフ行のセル =====
  const handleStaffKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    cursor: Extract<CellSelection, { kind: "staff" }>
  ) => {
    const clearCell = () => setStaffCells({ kind: "undecided" });

    // ----- 打つ入力: 確定キーで確定して、その向きへ動く -----
    if (editMode === "type") {
      const direction = directionOf(e);
      if (direction) {
        e.preventDefault();
        commitTypedAndMove(...direction);
        return;
      }
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          closeEditor(); // 打ち込みを取り消す（動かない）
          return;
        case "Backspace":
          e.preventDefault();
          backspaceInEditor(clearCell);
          return;
        default:
          if (isTypedChar(e)) {
            e.preventDefault();
            setInputBuffer((prev) => (prev ?? "") + e.key);
            setActiveIndex(0);
          }
          return;
      }
    }

    // ----- リスト選択: ↑↓で選び、Enter で確定して留まる -----
    if (editMode === "list") {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) =>
            suggestions.length === 0 ? 0 : Math.min(i + 1, suggestions.length - 1)
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          return;
        case "ArrowLeft":
        case "ArrowRight":
        case "Tab": {
          // 横へ抜けるときは確定せずに閉じて動く
          e.preventDefault();
          const direction = directionOf(e);
          if (direction) moveSelection(...direction);
          return;
        }
        case "Enter":
          e.preventDefault();
          if (suggestions.length > 0) applySuggestion(suggestions[activeClamped]);
          else closeEditor();
          return;
        case "Escape":
          e.preventDefault();
          closeEditor();
          return;
        case "Backspace":
          e.preventDefault();
          backspaceInEditor(clearCell);
          return;
        default:
          if (isTypedChar(e)) {
            e.preventDefault();
            setInputBuffer((prev) => (prev ?? "") + e.key); // 候補を絞る（リスト選択のまま）
            setActiveIndex(0);
          }
          return;
      }
    }

    // ----- 選択だけ -----
    const direction = directionOf(e);
    if (direction) {
      e.preventDefault();
      // ルール3：何も入力していない Enter / Tab は、確定提案があれば承認して次の提案へ
      // 範囲があるときは承認しない（Enter / Tab は範囲を解いて動く）
      const approveDirection: ApproveDirection | null =
        e.shiftKey || hasRange
        ? null
        : e.key === "Enter"
          ? "down"
          : e.key === "Tab"
            ? "right"
            : null;
      const forced =
        approveDirection && onApproveForced
          ? forcedCellOf?.(cursor.staffId, cursor.day)
          : undefined;
      if (approveDirection && onApproveForced && forced) {
        const jumped = onApproveForced(cursor.staffId, cursor.day, forced, approveDirection);
        if (!jumped) moveSelection(...direction);
        return;
      }
      moveSelection(...direction);
      return;
    }

    switch (e.key) {
      case "F2":
        e.preventDefault();
        beginEdit("list", ""); // カーソルはそのまま（範囲も解かない）
        return;
      case "Backspace":
      case "Delete":
        // 打たずにセルを未定（クリア）に戻す
        e.preventDefault();
        clearCell();
        return;
      case "Escape":
        e.preventDefault();
        // カットの点線があれば、それだけを消す（Excel と同じ）。無ければ選択を外す
        if (!clipboard?.onCancelCut()) setSelection(null);
        return;
      default:
        // 英数字を打ち始めたら打つ入力を開き、その文字をバッファに入れる
        if (isTypedChar(e)) {
          e.preventDefault();
          beginEdit("type", e.key);
        }
    }
  };

  // ===== コピー・カット・貼り付け（#166）=====
  /** 表の並び（キーボードのカーソルと同じ） */
  const order = () => ({ staffIds: layout.staffIds, days });
  /** 選択中のスタッフ行のセル（表の上から・左から順） */
  const staffTargets = (): CellRef[] =>
    targets.flatMap((c) => (c.kind === "staff" ? [{ staffId: c.staffId, day: c.day }] : []));
  /** 1つの長方形なら列数。飛び地を含む選択は null（位置が決まらないので文字にできない） */
  const columnsOfSelection = (): number | null => {
    if (activeAreas.length !== 1) return null;
    return new Set(staffTargets().map((c) => c.day.key)).size;
  };

  const copyOrCut = (e: ClipboardEvent<HTMLDivElement>, cut: boolean) => {
    // 打っている最中・必要人数のセルでは勤務表の操作にしない
    if (!clipboard || editing || selection?.kind !== "staff") return;
    e.preventDefault();
    const text = clipboard.onCopyCells(staffTargets(), { cut, columns: columnsOfSelection() });
    e.clipboardData.setData("text/plain", text ?? "");
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    if (!clipboard || editing || selection?.kind !== "staff") return;
    e.preventDefault();
    clipboard.onPasteValues(e.clipboardData.getData("text/plain"), {
      ...order(),
      targets: staffTargets(),
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Alt+↓ はリスト（メニュー）を開く（Excel と同じ）。修飾キーの早期 return より前で拾う
    if (e.altKey && e.key === "ArrowDown") {
      if (selection && !editing) {
        e.preventDefault();
        if (selection.kind === "staff") beginEdit("list", ""); // 範囲は解かない
        else onOpenRequiredList?.(selection.shiftName, selection.day);
      }
      return;
    }
    // 打っている途中の Ctrl/Cmd+Z は打ち込みの取り消し（Esc と同じ。動かない）。
    // 打っていなければ素通しして、勤務表の世界線を戻すショートカットに任せる
    if (editing && matchesShortcut(e, CANCEL_TYPING)) {
      e.preventDefault();
      closeEditor();
      return;
    }
    // オブジェクトとして貼る（Ctrl/Cmd+Shift+V）。ネイティブの貼り付けは出さない（#166）
    if (clipboard && !editing && matchesShortcut(e, PASTE_OBJECTS)) {
      if (selection?.kind === "staff") {
        e.preventDefault();
        clipboard.onPasteObjects(order());
      }
      return;
    }
    // それ以外の修飾キー付き（Shift は除く）はブラウザ/OS のショートカットに委ねる
    // （Ctrl/Cmd+C・X・V はグリッドの copy / cut / paste イベントで受ける）
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (!selection) {
      // 選択が無ければ矢印で左上のセルから始める。Enter / Tab はブラウザに任せる
      const direction = directionOf(e);
      if (direction && e.key.startsWith("Arrow")) {
        e.preventDefault();
        moveSelection(...direction);
      }
      return;
    }

    // Shift＋矢印は範囲を広げる／狭める（カーソルは起点のまま）。打っている途中は確定のキー
    if (e.shiftKey && e.key.startsWith("Arrow") && !editing) {
      const direction = directionOf(e);
      if (direction) {
        e.preventDefault();
        replaceLastArea((last) => extendArea(last, direction[0], direction[1], layout));
      }
      return;
    }

    if (selection.kind === "required") handleRequiredKeyDown(e, selection);
    else handleStaffKeyDown(e, selection);
  };

  return {
    gridRef,
    selection,
    inputBuffer,
    editMode,
    editing,
    suggestions,
    activeIndex: activeClamped,
    anchorEl,
    selectCell,
    selectRequired,
    applyRequiredCount: setRequiredCount,
    pressCell,
    dragToCell,
    isInRange,
    openEditor,
    applySuggestion,
    handleKeyDown,
    handleCopy: (e) => copyOrCut(e, false),
    handleCut: (e) => copyOrCut(e, true),
    handlePaste,
  };
}
