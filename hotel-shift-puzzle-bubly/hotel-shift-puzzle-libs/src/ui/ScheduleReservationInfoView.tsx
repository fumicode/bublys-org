'use client';

import { FC, Fragment, useRef, useEffect, useState } from "react";
import styled from "styled-components";
import { Popover } from "@mui/material";
import {
  DailyReservationInfo,
  type ReservationGroup,
  type GuestsRoomsField,
  type WorkingDay,
} from "../domain/index.js";
import { DAY_COL_WIDTH } from "./schedule-grid/constants.js";

/**
 * 予約・稼働情報を、勤務表グリッドと同じ「日付を列」に並べたグリッドで入力する
 * （元 Excel の日付ヘッダより上のブロック：中/夕/泊 の人数・部屋数、備考、婚礼）。
 *
 * - 数値行（中/夕/泊 の人数・部屋数）は 2モード制:
 *   - 移動モード: 矢印キーで選択セル（ハイライト）が移るだけ。テキスト編集にはならない。
 *   - 編集モード: Enter または数字キーで入力欄が出る。Enter で確定して下へ、Esc で取消。
 * - テキスト行（備考・婚礼）は Enter/ダブルクリックで広いポップオーバーを開いてすぐ入力できる。
 * - Ctrl+V で「1列目=人数, 2列目=部屋数」の CSV/TSV を、選択中の行のグループ（中/夕/泊）へ貼り付け。
 */

const LABEL_COL_WIDTH = 96;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Cell = { row: number; col: number };

type NumberFieldDef = {
  kind: "number";
  key: string;
  label: string;
  group: ReservationGroup;
  field: GuestsRoomsField;
  get: (info: DailyReservationInfo, day: WorkingDay) => number | undefined;
  set: (
    info: DailyReservationInfo,
    day: WorkingDay,
    v: number | undefined
  ) => DailyReservationInfo;
};
type TextFieldDef = {
  kind: "text";
  key: string;
  label: string;
  get: (info: DailyReservationInfo, day: WorkingDay) => string | undefined;
  set: (
    info: DailyReservationInfo,
    day: WorkingDay,
    v: string | undefined
  ) => DailyReservationInfo;
};
type FieldDef = NumberFieldDef | TextFieldDef;

/** 中/夕/泊 の人数・部屋数を1行として作る */
const numField = (
  label: string,
  group: ReservationGroup,
  field: GuestsRoomsField
): NumberFieldDef => ({
  kind: "number",
  key: `${group}.${field}`,
  label,
  group,
  field,
  get: (i, d) => i.numberOn(d, group, field),
  set: (i, d, v) => i.setNumber(d, group, field, v),
});

/** 表示する行（元 Excel の並び: 中 → 夕 → 泊 → 備考 → 婚礼。各グループは人数・部屋数の2行）。 */
const FIELDS: FieldDef[] = [
  numField("中 人数", "naka", "guests"),
  numField("中 部屋数", "naka", "rooms"),
  numField("夕 人数", "yu", "guests"),
  numField("夕 部屋数", "yu", "rooms"),
  numField("泊 人数", "haku", "guests"),
  numField("泊 部屋数", "haku", "rooms"),
  { kind: "text", key: "note", label: "備考", get: (i, d) => i.noteOn(d), set: (i, d, v) => i.setNote(d, v) },
  { kind: "text", key: "weddings", label: "婚礼", get: (i, d) => i.weddingsOn(d), set: (i, d, v) => i.setWeddings(d, v) },
];

/** 入力文字列を「0以上の整数 or undefined」に正規化する */
const parseNum = (raw: string): number | undefined => {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  if (Number.isNaN(n)) return undefined;
  return Math.max(0, Math.round(n));
};

/** CSV/TSV テキストを行ごとに { guests, rooms } へ。1列目=人数, 2列目=部屋数。 */
const parseCsv = (text: string): Array<{ guests?: number; rooms?: number }> =>
  text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const cells = line.split(/[\t,]/);
      return { guests: parseNum(cells[0] ?? ""), rooms: parseNum(cells[1] ?? "") };
    });

type ScheduleReservationInfoViewProps = {
  /** 対象の稼働日（1日〜末日） */
  days: WorkingDay[];
  /** その勤務表の予約・稼働情報（未作成でも空インスタンスを渡す） */
  info: DailyReservationInfo;
  /** 変更後のインスタンスを保存する（集約メソッドで作った新インスタンスを受ける） */
  onSave: (next: DailyReservationInfo) => void;
};

export const ScheduleReservationInfoView: FC<ScheduleReservationInfoViewProps> = ({
  days,
  info,
  onSave,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  // 数値インライン編集の確定用（sel/state の遅延に左右されず確定する）
  const editCellRef = useRef<Cell>({ row: 0, col: 0 });
  const editValueRef = useRef<string>("");
  const selectAllRef = useRef<boolean>(true);

  const [sel, setSel] = useState<Cell>({ row: 0, col: 0 });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  // テキスト行（備考・婚礼）のポップオーバー編集
  const [textEdit, setTextEdit] = useState<{ row: number; col: number; anchor: HTMLElement } | null>(null);
  const [textValue, setTextValue] = useState("");

  const cellKey = (r: number, c: number) => `${r}:${c}`;
  const setCellRef = (r: number, c: number) => (el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(cellKey(r, c), el);
    else cellRefs.current.delete(cellKey(r, c));
  };

  // マウント時にグリッドへフォーカス（すぐ矢印移動・Ctrl+V できるように）
  useEffect(() => {
    gridRef.current?.focus();
  }, []);

  // 数値編集の開始/終了でフォーカスを移す。開始時のみテキスト全選択（Enter/数字入力で挙動を変える）
  useEffect(() => {
    if (editing) {
      const el = editRef.current;
      if (el) {
        el.focus();
        if (selectAllRef.current) el.select();
        else {
          const n = el.value.length;
          el.setSelectionRange(n, n);
        }
      }
    } else if (!textEdit) {
      gridRef.current?.focus();
    }
  }, [editing, textEdit]);

  const clampCell = (c: Cell): Cell => ({
    row: Math.max(0, Math.min(FIELDS.length - 1, c.row)),
    col: Math.max(0, Math.min(days.length - 1, c.col)),
  });

  const startEditNumber = (cell: Cell, initial?: string) => {
    const field = FIELDS[cell.row];
    const day = days[cell.col];
    if (!field || field.kind !== "number" || !day) return;
    const mv = field.get(info, day);
    const val = initial ?? (mv === undefined ? "" : String(mv));
    editCellRef.current = cell;
    editValueRef.current = val;
    selectAllRef.current = initial === undefined;
    setSel(cell);
    setEditValue(val);
    setEditing(true);
  };

  const commitNumber = () => {
    const cell = editCellRef.current;
    const field = FIELDS[cell.row];
    const day = days[cell.col];
    if (!field || field.kind !== "number" || !day) return;
    onSave(field.set(info, day, parseNum(editValueRef.current)));
  };

  const clearCell = (cell: Cell) => {
    const field = FIELDS[cell.row];
    const day = days[cell.col];
    if (!field || !day) return;
    onSave(field.set(info, day, undefined));
  };

  // テキスト行（備考・婚礼）を広いポップオーバーで編集する
  const openText = (row: number, col: number) => {
    const field = FIELDS[row];
    if (field.kind !== "text") return;
    const el = cellRefs.current.get(cellKey(row, col));
    if (!el) return;
    const day = days[col];
    setSel({ row, col });
    setTextValue((day && field.get(info, day)) || "");
    setTextEdit({ row, col, anchor: el });
  };

  const closeText = () => {
    if (textEdit) {
      const field = FIELDS[textEdit.row];
      const day = days[textEdit.col];
      if (field.kind === "text" && day) onSave(field.set(info, day, textValue));
    }
    setTextEdit(null);
    setTextValue("");
    gridRef.current?.focus();
  };

  const nextAfterEnter = (cell: Cell): Cell =>
    cell.row === FIELDS.length - 1
      ? clampCell({ row: 0, col: cell.col + 1 })
      : { row: cell.row + 1, col: cell.col };

  // ---- 移動モード（グリッドにフォーカス中）のキー操作 ----
  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing || textEdit) return; // 編集中は各エディタ側で処理

    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      // 貼り付け先グループは選択中の行のグループ（中/夕/泊）。テキスト行選択中は「泊」に入れる。
      const selField = FIELDS[sel.row];
      const group: ReservationGroup = selField.kind === "number" ? selField.group : "haku";
      navigator.clipboard
        ?.readText?.()
        .then((text) => {
          if (!text) return;
          let next = info;
          parseCsv(text).forEach((row, i) => {
            const day = days[sel.col + i];
            if (!day) return;
            if (row.guests !== undefined) next = next.setNumber(day, group, "guests", row.guests);
            if (row.rooms !== undefined) next = next.setNumber(day, group, "rooms", row.rooms);
          });
          onSave(next);
        })
        .catch(() => {
          /* クリップボード権限が無い等は無視 */
        });
      return;
    }

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        setSel((s) => clampCell({ row: s.row - 1, col: s.col }));
        break;
      case "ArrowDown":
        e.preventDefault();
        setSel((s) => clampCell({ row: s.row + 1, col: s.col }));
        break;
      case "ArrowLeft":
        e.preventDefault();
        setSel((s) => clampCell({ row: s.row, col: s.col - 1 }));
        break;
      case "ArrowRight":
        e.preventDefault();
        setSel((s) => clampCell({ row: s.row, col: s.col + 1 }));
        break;
      case "Enter":
        e.preventDefault();
        if (FIELDS[sel.row].kind === "text") openText(sel.row, sel.col);
        else startEditNumber(sel);
        break;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        clearCell(sel);
        break;
      default:
        if (FIELDS[sel.row].kind === "number" && /^[0-9]$/.test(e.key)) {
          e.preventDefault();
          startEditNumber(sel, e.key);
        }
    }
  };

  // ---- 数値編集モード（input にフォーカス中）のキー操作 ----
  const onEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitNumber();
      const next = nextAfterEnter(editCellRef.current);
      setEditing(false);
      setSel(next);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false); // 取消（commit しない）
    }
  };

  const gridTemplateColumns = `${LABEL_COL_WIDTH}px repeat(${days.length}, ${DAY_COL_WIDTH}px)`;

  return (
    <StyledWrap>
      <div
        className="e-grid"
        style={{ gridTemplateColumns }}
        ref={gridRef}
        tabIndex={0}
        role="grid"
        onKeyDown={onGridKeyDown}
      >
        {/* ヘッダ行: 左上の角 + 日付ヘッダ */}
        <div className="e-corner">予約</div>
        {days.map((day) => {
          const wd = day.weekday;
          return (
            <div
              key={day.key}
              className={`e-day-head${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}`}
            >
              <span className="e-day-num">{day.day}</span>
              <span className="e-day-wd">{WEEKDAYS[wd]}</span>
            </div>
          );
        })}

        {/* 項目行 */}
        {FIELDS.map((field, row) => (
          <Fragment key={field.key}>
            <div className="e-row-head">{field.label}</div>
            {days.map((day, col) => {
              const selected = sel.row === row && sel.col === col;
              const wd = day.weekday;
              const cls =
                `e-cell${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}` +
                `${selected ? " is-selected" : ""}` +
                `${field.kind === "text" ? " is-note" : ""}`;

              // 数値インライン編集中のセル
              if (field.kind === "number" && editing && selected) {
                return (
                  <div key={day.key} className={cls} ref={setCellRef(row, col)}>
                    <input
                      ref={editRef}
                      type="text"
                      inputMode="numeric"
                      value={editValue}
                      onChange={(e) => {
                        editValueRef.current = e.target.value;
                        setEditValue(e.target.value);
                      }}
                      onKeyDown={onEditKeyDown}
                      onBlur={() => {
                        commitNumber();
                        setEditing(false);
                      }}
                    />
                  </div>
                );
              }

              // 通常表示（数値 or テキストの要約）
              const display =
                field.kind === "number"
                  ? (() => {
                      const v = field.get(info, day);
                      return v === undefined ? "" : v;
                    })()
                  : field.get(info, day) ?? "";
              return (
                <div
                  key={day.key}
                  className={cls}
                  ref={setCellRef(row, col)}
                  title={field.kind === "text" && display ? String(display) : undefined}
                  onMouseDown={() => setSel({ row, col })}
                  onDoubleClick={() =>
                    field.kind === "text" ? openText(row, col) : startEditNumber({ row, col })
                  }
                >
                  <span className="e-value">{display}</span>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* テキスト行（備考・婚礼）の編集（広いポップオーバー。開いたら即入力できるようフォーカスする） */}
      <Popover
        open={!!textEdit}
        anchorEl={textEdit?.anchor ?? null}
        onClose={closeText}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        TransitionProps={{
          onEntered: () => {
            const el = textRef.current;
            if (el) {
              el.focus();
              const n = el.value.length;
              el.setSelectionRange(n, n);
            }
          },
        }}
      >
        <NoteEditor>
          <div className="e-note-label">
            {textEdit ? FIELDS[textEdit.row].label : ""}
            {textEdit ? `（${days[textEdit.col]?.label ?? ""}）` : ""}
          </div>
          <textarea
            ref={textRef}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              // Esc で閉じる（保存）。Enter は改行として通す。
              if (e.key === "Escape") {
                e.preventDefault();
                closeText();
              }
            }}
            placeholder="フリーテキスト（例: 婚礼10:00〜、団体20名 など）"
          />
          <div className="e-note-hint">閉じると保存されます（Esc でも保存）</div>
        </NoteEditor>
      </Popover>

      <p className="e-hint">
        矢印キーでセル移動（フォーカスが移るだけ）。数値行は <kbd>Enter</kbd> または数字キーで編集、
        テキスト行（備考・婚礼）は <kbd>Enter</kbd> かダブルクリックで入力欄が開きます。
        <kbd>Ctrl</kbd>+<kbd>V</kbd> は「1列目＝人数・2列目＝部屋数」の CSV を、
        選択中の行のグループ（中/夕/泊）へ貼り付けます（先頭セルで全日ぶん）。
      </p>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  .e-grid {
    display: inline-grid;
    border: 1px solid #eee;
    border-radius: 4px;
    max-width: 100%;
    overflow: auto;
    outline: none;
  }

  .e-corner,
  .e-day-head,
  .e-row-head,
  .e-cell {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
  }

  .e-corner {
    position: sticky;
    left: 0;
    top: 0;
    z-index: 3;
    background: #fff8f0;
    color: #5d4037;
    font-weight: bold;
    font-size: 0.75em;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .e-day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px 0;
    min-height: 34px;

    .e-day-num {
      font-weight: bold;
      font-size: 0.85em;
    }
    .e-day-wd {
      font-size: 0.7em;
      color: #999;
    }
    &.is-sun .e-day-num,
    &.is-sun .e-day-wd {
      color: #d32f2f;
    }
    &.is-sat .e-day-num,
    &.is-sat .e-day-wd {
      color: #1976d2;
    }
  }

  .e-row-head {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fff8f0;
    color: #5d4037;
    font-weight: bold;
    font-size: 0.76em;
    display: flex;
    align-items: center;
    padding: 0 8px;
    white-space: nowrap;
  }

  .e-cell {
    position: relative;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    min-height: 26px;
    background: #fff;
    cursor: cell;

    &.is-sun {
      background: #fff9f9;
    }
    &.is-sat {
      background: #f7fbff;
    }
    &.is-note {
      min-height: 40px;
    }
    /* 移動モードの選択セル（テキスト選択にはしない・枠のハイライトだけ） */
    &.is-selected {
      box-shadow: inset 0 0 0 2px #ffb74d;
      background: #fffdf5;
      z-index: 1;
    }

    .e-value {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85em;
      font-variant-numeric: tabular-nums;
      user-select: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 2px;
    }
    &.is-note .e-value {
      justify-content: flex-start;
      align-items: flex-start;
      font-size: 0.62em;
      color: #6d4c41;
      white-space: pre-wrap;
      word-break: break-all;
      text-overflow: clip;
      padding: 3px;
      line-height: 1.25;
    }

    input {
      width: 100%;
      height: 100%;
      min-height: 26px;
      border: none;
      background: #fffdf5;
      text-align: center;
      font-size: 0.85em;
      font-variant-numeric: tabular-nums;
      outline: none;
      box-sizing: border-box;
      padding: 2px;
    }
  }

  .e-hint {
    margin: 8px 2px 0;
    font-size: 0.75em;
    color: #999;
    line-height: 1.6;
    max-width: 680px;

    kbd {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 0 4px;
      font-size: 0.9em;
      font-family: inherit;
    }
  }
`;

const NoteEditor = styled.div`
  padding: 8px;

  .e-note-label {
    font-size: 0.8em;
    font-weight: bold;
    color: #5d4037;
    margin-bottom: 4px;
  }

  textarea {
    width: 280px;
    height: 96px;
    resize: both;
    border: 1px solid #e0d6cc;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 0.9em;
    font-family: inherit;
    outline: none;

    &:focus {
      border-color: #ffb74d;
      box-shadow: 0 0 0 2px #ffe0b2;
    }
  }

  .e-note-hint {
    margin-top: 4px;
    font-size: 0.72em;
    color: #aaa;
  }
`;
