import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  suggestShiftInputs,
  type ScheduleAvailability,
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
  availability?: ScheduleAvailability;
  /** セルの勤務割当を変更する（確定時に呼ぶ）。 */
  onChangeCell: (staffId: string, day: WorkingDay, to: ShiftCell) => void;
  /** feature 層と共有する制御選択。undefined のときだけ内部 state を使う。 */
  selection?: CellSelection | null;
  onSelectionChange?: (selection: CellSelection | null) => void;
};

export type CellKeyboardEditing = {
  /** キー入力を受けるグリッド要素の ref（tabIndex + onKeyDown を付ける先）。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** フォーカス中のセル（無ければ null）。 */
  selection: CellSelection | null;
  /** 打ち込み中のバッファ。null は非入力（ドロップダウン閉）、"" 以上は入力中（開）。 */
  inputBuffer: string | null;
  /** ドロップダウンを開いているか（inputBuffer !== null）。 */
  editing: boolean;
  /** 現在の入力候補（前方一致）。 */
  suggestions: ShiftSuggestion[];
  /** ハイライト中の候補インデックス（範囲内にクランプ済み）。 */
  activeIndex: number;
  /** 候補ドロップダウンのアンカー要素（選択セルの DOM）。 */
  anchorEl: HTMLElement | null;
  /** セルを選択（ドロップダウンは閉じる）。 */
  selectCell: (staffId: string, day: WorkingDay) => void;
  /** セルを選択して候補ドロップダウンを開く（全候補表示）。 */
  openEditor: (staffId: string, day: WorkingDay) => void;
  /** 候補を確定（クリック / Enter）。 */
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
 * ルール:
 *   - ドロップダウン閉: 矢印でセル移動 / 英数字 or Enter で開く / Backspace で未定クリア
 *   - ドロップダウン開: ↑↓で候補移動 / Enter・クリックで確定 / ←→で閉じて隣セルへ /
 *                       Backspace で 1 文字削除（空ならクリアして閉じる）/ Esc で閉じる
 */
export function useCellKeyboardEditing({
  staffList,
  days,
  shiftOptions,
  availability,
  onChangeCell,
  selection: controlledSelection,
  onSelectionChange,
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
  const [activeIndex, setActiveIndex] = useState(0);

  // 選択中スタッフが入れる勤務帯だけに絞る（可能勤務帯があれば）
  const selectableShiftOptions =
    availability && selection
      ? shiftOptions.filter((w) => availability.isAllowed(selection.staffId, w.id))
      : shiftOptions;

  // 入力候補（前方一致）。バッファが null（非入力）なら候補は出さない
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

  const selectCell = (staffId: string, day: WorkingDay) => {
    setSelection({ staffId, day });
    setInputBuffer(null);
    gridRef.current?.focus();
  };

  const openEditor = (staffId: string, day: WorkingDay) => {
    setSelection({ staffId, day });
    setInputBuffer("");
    setActiveIndex(0);
    gridRef.current?.focus();
  };

  const applySuggestion = (s: ShiftSuggestion) => {
    if (selection) onChangeCell(selection.staffId, selection.day, suggestionToCell(s));
    setInputBuffer(null);
    gridRef.current?.focus();
  };

  // 選択を dStaff 行・dDay 列ぶん動かす（端でクランプ）。入力中バッファは破棄
  const moveSelection = (dStaff: number, dDay: number) => {
    setInputBuffer(null);
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

  const editing = inputBuffer !== null;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // 修飾キー付きはブラウザ/OS のショートカットに委ねる
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // ----- ドロップダウンを開いている間: 矢印は候補移動、Enter で確定 -----
    if (editing && selection) {
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
          // 横移動はドロップダウンを閉じて隣のセルへ（表計算的に編集を抜ける）
          e.preventDefault();
          moveSelection(0, -1);
          return;
        case "ArrowRight":
          e.preventDefault();
          moveSelection(0, 1);
          return;
        case "Enter":
          e.preventDefault();
          if (suggestions.length > 0) applySuggestion(suggestions[activeClamped]);
          else setInputBuffer(null);
          return;
        case "Escape":
          e.preventDefault();
          setInputBuffer(null); // 打ち込みを取り消してドロップダウンを閉じる（選択は残す）
          return;
        case "Backspace":
          e.preventDefault();
          if (inputBuffer && inputBuffer.length > 0) {
            setInputBuffer(inputBuffer.slice(0, -1));
            setActiveIndex(0);
          } else {
            // 空の状態でさらに消したらセルを未定（クリア）にして閉じる
            onChangeCell(selection.staffId, selection.day, { kind: "undecided" });
            setInputBuffer(null);
          }
          return;
        default:
          if (e.key.length === 1 && /^[0-9a-zA-Z]$/.test(e.key)) {
            e.preventDefault();
            setInputBuffer((prev) => (prev ?? "") + e.key);
            setActiveIndex(0);
          }
          return;
      }
    }

    // ----- ドロップダウンを閉じている間: 矢印はセル移動 -----
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        moveSelection(-1, 0);
        return;
      case "ArrowDown":
        e.preventDefault();
        moveSelection(1, 0);
        return;
      case "ArrowLeft":
        e.preventDefault();
        moveSelection(0, -1);
        return;
      case "ArrowRight":
        e.preventDefault();
        moveSelection(0, 1);
        return;
    }

    if (!selection) return;

    switch (e.key) {
      case "Enter":
        // 選択セルでドロップダウンを開く（全候補を表示）
        e.preventDefault();
        openEditor(selection.staffId, selection.day);
        return;
      case "Backspace":
        // 打ち込まずにセルを未定（クリア）に戻す
        e.preventDefault();
        onChangeCell(selection.staffId, selection.day, { kind: "undecided" });
        return;
      case "Escape":
        e.preventDefault();
        setSelection(null);
        return;
      default:
        // 英数字を打ち始めたらドロップダウンを開き、その文字をバッファに入れる
        if (e.key.length === 1 && /^[0-9a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          setInputBuffer(e.key);
          setActiveIndex(0);
        }
    }
  };

  return {
    gridRef,
    selection,
    inputBuffer,
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
