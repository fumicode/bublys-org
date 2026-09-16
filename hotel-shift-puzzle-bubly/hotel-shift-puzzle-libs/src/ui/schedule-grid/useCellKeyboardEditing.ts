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
};

/** 確定提案を承認したあと、次の提案を探す向き（Enter＝下 / Tab＝右） */
export type ApproveDirection = "right" | "down";

/**
 * 編集の状態。Excel と同じく「打って入力する」と「リストから選ぶ」を分ける。
 *   - type : 文字を打っている。Enter / Tab / 矢印で確定し、その向きへ動く
 *   - list : リストを開いて選んでいる（Alt+↓ / F2 / ダブルクリック）。↑↓で選び、確定しても動かない
 */
export type EditMode = "type" | "list";

export type CellKeyboardEditing = {
  /** キー入力を受けるグリッド要素の ref（tabIndex + onKeyDown を付ける先）。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** フォーカス中のセル（無ければ null）。 */
  selection: CellSelection | null;
  /** 打ち込み中のバッファ。null は非入力（ドロップダウン閉）、"" 以上は入力中（開）。 */
  inputBuffer: string | null;
  /** 編集の状態（打つ入力／リスト選択）。閉じていれば null。 */
  editMode: EditMode | null;
  /** ドロップダウンを開いているか（editMode !== null）。 */
  editing: boolean;
  /** 現在の入力候補（前方一致）。 */
  suggestions: ShiftSuggestion[];
  /** ハイライト中の候補インデックス（範囲内にクランプ済み）。 */
  activeIndex: number;
  /** 候補ドロップダウンのアンカー要素（選択セルの DOM）。 */
  anchorEl: HTMLElement | null;
  /** セルを選択（ドロップダウンは閉じる）。 */
  selectCell: (staffId: string, day: WorkingDay) => void;
  /** セルを選択してリスト選択を開く（全候補表示。ダブルクリック）。 */
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

/**
 * 勤務表グリッドのキーボード操作（セル選択・矢印移動・打ち込みでの勤務帯確定）を
 * まとめたフック。状態と対話ロジックをここに閉じ込め、ScheduleGridView は描画に徹する。
 *
 * カーソル移動は Excel に準拠する（#152）。ルールは3つだけ:
 *   1. **打って入力した値は、押したキーの向きへ動いて確定する**
 *      （Enter↓ / Shift+Enter↑ / Tab→ / Shift+Tab← / 矢印はその向き）
 *   2. **リストから選んだ値は、その場に留まって確定する**（リストでの Enter・候補のクリック）
 *   3. **何も入力していないときの Enter / Tab は移動。** そのセルに確定提案（点線）があれば、
 *      承認してその向きの次の提案セルへ飛ぶ（次の提案を探すのは feature 層）
 *
 * 状態ごとのキー:
 *   - 選択だけ  : 矢印・Enter・Tab で移動 / Alt+↓・F2 でリストを開く / 英数字で打つ入力を開く /
 *                 Backspace・Delete で未定に戻す / Esc で選択を外す
 *   - 打つ入力  : 英数字・Backspace で打つ / Enter・Tab・矢印で先頭の候補で確定して動く /
 *                 Esc で取り消す（動かない）
 *   - リスト選択: ↑↓で候補を選ぶ / Enter で確定して留まる / 英数字・Backspace で絞る /
 *                 ←→・Tab で確定せずに閉じて動く / Esc で閉じる
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
}: UseCellKeyboardEditingParams): CellKeyboardEditing {
  const gridRef = useRef<HTMLDivElement>(null);
  const [internalSelection, setInternalSelection] =
    useState<CellSelection | null>(null);
  const selection =
    controlledSelection === undefined
      ? internalSelection
      : controlledSelection;
  const setSelection = (
    next:
      | CellSelection
      | null
      | ((previous: CellSelection | null) => CellSelection | null)
  ) => {
    const resolved =
      typeof next === "function" ? next(selection) : next;
    if (controlledSelection === undefined) setInternalSelection(resolved);
    onSelectionChange?.(resolved);
  };
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // 選択中スタッフが入れる勤務帯だけに絞る（可能勤務帯があれば）
  const selectableShiftOptions =
    staffGroup && selection
      ? shiftOptions.filter((w) => staffGroup.isAllowed(selection.staffId, w.id))
      : shiftOptions;

  // 入力候補（前方一致）。閉じていれば候補は出さない
  const suggestions: ShiftSuggestion[] =
    inputBuffer !== null ? suggestShiftInputs(inputBuffer, selectableShiftOptions) : [];
  // 候補が減ったときに範囲外を指さないようクランプ
  const activeClamped = Math.min(activeIndex, Math.max(suggestions.length - 1, 0));

  // ドロップダウンのアンカー要素を、選択セルの DOM から data 属性で引く
  // （クリック選択・矢印移動どちらでも同じ経路で取れる）
  const selectionKey = selection ? `${selection.staffId}:${selection.day.key}` : null;
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
    setSelection({ staffId, day });
    closeEditor();
    gridRef.current?.focus();
  };

  const openEditor = (staffId: string, day: WorkingDay) => {
    setSelection({ staffId, day });
    beginEdit("list", "");
    gridRef.current?.focus();
  };

  // 選択を dStaff 行・dDay 列ぶん動かす（端でクランプ）。編集中なら閉じる
  const moveSelection = (dStaff: number, dDay: number) => {
    closeEditor();
    setSelection((prev) => {
      if (staffList.length === 0 || days.length === 0) return prev;
      if (!prev) return { staffId: staffList[0].id, day: days[0] };
      const si = staffList.findIndex((s) => s.id === prev.staffId);
      const di = days.findIndex((d) => d.key === prev.day.key);
      if (si < 0 || di < 0) return { staffId: staffList[0].id, day: days[0] };
      const ns = Math.min(Math.max(si + dStaff, 0), staffList.length - 1);
      const nd = Math.min(Math.max(di + dDay, 0), days.length - 1);
      return { staffId: staffList[ns].id, day: days[nd] };
    });
  };

  /** 候補でセルを確定して閉じる（動かない） */
  const commit = (s: ShiftSuggestion) => {
    if (selection) onChangeCell(selection.staffId, selection.day, suggestionToCell(s));
    closeEditor();
  };

  // リストから選んだ（クリック）＝ルール2：確定して留まる
  const applySuggestion = (s: ShiftSuggestion) => {
    commit(s);
    gridRef.current?.focus();
  };

  // 打った値＝ルール1：先頭の候補で確定して、その向きへ動く。候補が無ければ変えずに動く
  const commitTypedAndMove = (dStaff: number, dDay: number) => {
    if (suggestions.length > 0) commit(suggestions[activeClamped]);
    moveSelection(dStaff, dDay);
  };

  const editing = editMode !== null;

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

  /** 打つ入力・リスト選択とも、Backspace は1文字消す。空でさらに消したらセルを未定にして閉じる */
  const backspaceInEditor = () => {
    if (!selection) return;
    if (inputBuffer && inputBuffer.length > 0) {
      setInputBuffer(inputBuffer.slice(0, -1));
      setActiveIndex(0);
      return;
    }
    onChangeCell(selection.staffId, selection.day, { kind: "undecided" });
    closeEditor();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Alt+↓ はリストを開く（Excel と同じ）。修飾キーの早期 return より前で拾う
    if (e.altKey && e.key === "ArrowDown") {
      if (selection && !editing) {
        e.preventDefault();
        openEditor(selection.staffId, selection.day);
      }
      return;
    }
    // それ以外の修飾キー付き（Shift は除く）はブラウザ/OS のショートカットに委ねる
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // ----- 打つ入力: 確定キーで確定して、その向きへ動く -----
    if (editMode === "type" && selection) {
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
          backspaceInEditor();
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
    if (editMode === "list" && selection) {
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
          backspaceInEditor();
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
    if (!selection) {
      // 選択が無ければ矢印で先頭セルから始める。Enter / Tab はブラウザに任せる
      if (direction && e.key.startsWith("Arrow")) {
        e.preventDefault();
        moveSelection(...direction);
      }
      return;
    }

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
          ? forcedCellOf?.(selection.staffId, selection.day)
          : undefined;
      if (approveDirection && onApproveForced && forced) {
        const jumped = onApproveForced(
          selection.staffId,
          selection.day,
          forced,
          approveDirection
        );
        if (!jumped) moveSelection(...direction);
        return;
      }
      moveSelection(...direction);
      return;
    }

    switch (e.key) {
      case "F2":
        e.preventDefault();
        openEditor(selection.staffId, selection.day);
        return;
      case "Backspace":
      case "Delete":
        // 打たずにセルを未定（クリア）に戻す
        e.preventDefault();
        onChangeCell(selection.staffId, selection.day, { kind: "undecided" });
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
    openEditor,
    applySuggestion,
    handleKeyDown,
  };
}
