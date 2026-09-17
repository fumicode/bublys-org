import {
  useEffect,
  useRef,
  useState,
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
import type { CellSelection } from "./types.js";
import { moveCursor } from "./gridCursor.js";

type UseCellKeyboardEditingParams = {
  /** 行の並び（上下移動の順序）。 */
  staffList: Staff[];
  /** 列の並び（左右移動の順序）。 */
  days: WorkingDay[];
  /** この勤務表で選べる勤務帯。 */
  shiftOptions: WorkShift[];
  /** あれば「選択スタッフが入れる勤務帯」に候補を絞る。 */
  staffGroup?: WorkingStaffGroup;
  /** セルの勤務割当を変更する（確定時に呼ぶ）。 */
  onChangeCell: (staffId: string, day: WorkingDay, to: ShiftCell) => void;
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
  /** 必要人数を確定する。day が null なら全日まとめて（行の見出し） */
  onChangeRequiredCell?: (shiftName: string, day: WorkingDay | null, count: number) => void;
  /** 必要人数のメニュー（0〜最大値から選ぶ）を開く。day が null なら全日まとめて */
  onOpenRequiredList?: (shiftName: string, day: WorkingDay | null) => void;
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
  /** スタッフ行のセルを選択してリスト選択を開く（全候補表示。ダブルクリック）。 */
  openEditor: (staffId: string, day: WorkingDay) => void;
  /** リストから選んだ候補で確定する（クリック）。**動かない。** */
  applySuggestion: (s: ShiftSuggestion) => void;
  /** グリッドの onKeyDown ハンドラ。 */
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
};

/** 候補を勤務割当（ShiftCell）へ変換する。 */
const suggestionToCell = (s: ShiftSuggestion): ShiftCell => {
  if (s.kind === "work") return { kind: "work", shiftId: s.shift.id };
  if (s.kind === "day-off") return { kind: "day-off" };
  return { kind: "undecided" };
};

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
  onChangeCell,
  selection: controlledSelection,
  onSelectionChange,
  forcedCellOf,
  onApproveForced,
  requiredShiftNames = [],
  maxRequired,
  onChangeRequiredCell,
  onOpenRequiredList,
}: UseCellKeyboardEditingParams): CellKeyboardEditing {
  const gridRef = useRef<HTMLDivElement>(null);
  const [internalSelection, setInternalSelection] =
    useState<CellSelection | null>(null);
  const selection =
    controlledSelection === undefined
      ? internalSelection
      : controlledSelection;
  const setSelection = (next: CellSelection | null) => {
    if (controlledSelection === undefined) setInternalSelection(next);
    onSelectionChange?.(next);
  };
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // スタッフ行のセルにいるときだけの値（候補・アンカー）
  const staffSelection = selection?.kind === "staff" ? selection : null;

  // 選択中スタッフが入れる勤務帯だけに絞る（可能勤務帯があれば）
  const selectableShiftOptions =
    staffGroup && staffSelection
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

  /** 候補でスタッフ行のセルを確定して閉じる（動かない） */
  const commit = (s: ShiftSuggestion) => {
    if (staffSelection) {
      onChangeCell(staffSelection.staffId, staffSelection.day, suggestionToCell(s));
    }
    closeEditor();
  };

  // リストから選んだ（クリック）＝ルール2：確定して留まる
  const applySuggestion = (s: ShiftSuggestion) => {
    commit(s);
    gridRef.current?.focus();
  };

  // 打った値＝ルール1：先頭の候補で確定して、その向きへ動く。候補が無ければ変えずに動く
  const commitTypedAndMove = (dRow: number, dCol: number) => {
    if (suggestions.length > 0) commit(suggestions[activeClamped]);
    moveSelection(dRow, dCol);
  };

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
  const handleRequiredKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    cursor: Extract<CellSelection, { kind: "required" }>
  ) => {
    const setCount = (count: number) =>
      onChangeRequiredCell?.(cursor.shiftName, cursor.day, count);

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
        moveSelection(...direction);
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
    const clearCell = () => onChangeCell(cursor.staffId, cursor.day, { kind: "undecided" });

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
      const approveDirection: ApproveDirection | null = e.shiftKey
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
        openEditor(cursor.staffId, cursor.day);
        return;
      case "Backspace":
      case "Delete":
        // 打たずにセルを未定（クリア）に戻す
        e.preventDefault();
        clearCell();
        return;
      case "Escape":
        e.preventDefault();
        setSelection(null);
        return;
      default:
        // 英数字を打ち始めたら打つ入力を開き、その文字をバッファに入れる
        if (isTypedChar(e)) {
          e.preventDefault();
          beginEdit("type", e.key);
        }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Alt+↓ はリスト（メニュー）を開く（Excel と同じ）。修飾キーの早期 return より前で拾う
    if (e.altKey && e.key === "ArrowDown") {
      if (selection && !editing) {
        e.preventDefault();
        if (selection.kind === "staff") openEditor(selection.staffId, selection.day);
        else onOpenRequiredList?.(selection.shiftName, selection.day);
      }
      return;
    }
    // それ以外の修飾キー付き（Shift は除く）はブラウザ/OS のショートカットに委ねる
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
    openEditor,
    applySuggestion,
    handleKeyDown,
  };
}
