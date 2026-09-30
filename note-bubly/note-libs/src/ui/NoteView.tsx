'use client';
/**
 * メモの見た目 ── **ただのメモとして書ける所**。
 *
 * > **いま居る行は、書いたまま。ほかの行は、出来上がった姿。**
 *
 * ★ 装飾は**ボタン 1 つ**で付く。見出し・チェック・太字・取り消し・引用・字下げ。
 *   種類を選ばせる欄は作らない ── それだと「書く」と「分ける」で 2 手になる。
 *   装飾がそのまま意味になるので、押した時点で読み解きも変わる。
 * ★ **拾ったものは、拾った行に出す**（右端の淡い札）。外れていたら見えるので直せる。
 *   黙って賢く振る舞うより、見えていて直せるほうが信用される。
 * ★ 指（ほかのバブリのもの）は札で出す。名前は持ち主に訊くので、**向こうで直せば
 *   ここも変わる** ── 名前を写して持たない。
 */
import {
  ComponentPropsWithoutRef,
  DragEvent as ReactDragEvent,
  FC,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import { Note_メモ } from "../domain/Note.domain.js";
import { NoteLine_行, type LineMark } from "../domain/NoteLine.domain.js";
import type { NoteItem } from "../domain/read/readNote.js";

/** 指の目印。描くときに札へ置き換える */
const REF_PATTERN = /@\{([A-Za-z][A-Za-z0-9-]*):([^}]+)\}/g;

export type NoteViewProps = {
  note: Note_メモ;
  /** 読み解いた結果。行ごとに「何を拾ったか」を出すのに使う */
  items: readonly NoteItem[];
  /** 指の名前を引く（引くのは feature 層の仕事） */
  nameOfRef?: (ref: ObjectRef) => string | undefined;
  /** 指を出すときの中身（掴める札にするため、feature 層が作る） */
  renderRef?: (ref: ObjectRef) => ReactNode;
  onTitleChange?: (title: string) => void;
  onLineChange?: (line: NoteLine_行) => void;
  onToggleMark?: (lineId: string, mark: LineMark) => void;
  onNewLineAfter?: (lineId: string) => string | undefined;
  onRemoveLine?: (lineId: string) => void;
  /** 落ちてきたものを、いま居る行に挿す */
  onDropRef?: (lineId: string | null, e: ReactDragEvent) => boolean;
  canAccept?: (e: ReactDragEvent) => boolean;
  /** 並びの上に置く口（「旅程にする」など） */
  head?: ReactNode;
};

export const NoteView: FC<NoteViewProps> = ({
  note,
  items,
  nameOfRef,
  renderRef,
  onTitleChange,
  onLineChange,
  onToggleMark,
  onNewLineAfter,
  onRemoveLine,
  onDropRef,
  canAccept,
  head,
}) => {
  /** いま書いている行。ここだけ「書いたまま」になる */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 次に focus を移す行（改行したあと） */
  const [focusNext, setFocusNext] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState(note.title);
  useEffect(() => setTitle(note.title), [note.title]);

  useEffect(() => {
    if (!focusNext) return;
    setEditingId(focusNext);
    setFocusNext(null);
  }, [focusNext]);

  const handleDragOver = (e: ReactDragEvent) => {
    if (!onDropRef || !canAccept?.(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };
  const handleDragLeave = (e: ReactDragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };

  const editing = editingId ? note.line(editingId) : undefined;

  return (
    <StyledNote data-drag-over={dragOver ? "on" : "off"} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      <header className="e-head">
        <input
          className="e-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== note.title && onTitleChange?.(title.trim())}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        {head}
      </header>

      {/*
        装飾の口。**いま居る行に効く** ── 何も書いていないときは押せない。
        押しても書いている所から離れないよう、`onMouseDown` で焦点を奪わせない。
      */}
      <nav className="e-tools" onMouseDown={(e) => e.preventDefault()}>
        <ToolButton label="見出し" on={!!editing?.isHeading} disabled={!editing}
          onClick={() => editing && onLineChange?.(editing.withHeading(1))} >H</ToolButton>
        <ToolButton label="やること" on={!!editing?.has("todo")} disabled={!editing}
          onClick={() => editing && onToggleMark?.(editing.id, "todo")}>☑</ToolButton>
        <ToolButton label="太字（強い）" on={!!editing?.has("strong")} disabled={!editing}
          onClick={() => editing && onToggleMark?.(editing.id, "strong")}><b>B</b></ToolButton>
        <ToolButton label="取り消し（拾わない）" on={!!editing?.has("strike")} disabled={!editing}
          onClick={() => editing && onToggleMark?.(editing.id, "strike")}><s>S</s></ToolButton>
        <ToolButton label="引用（拾わない）" on={!!editing?.has("quote")} disabled={!editing}
          onClick={() => editing && onToggleMark?.(editing.id, "quote")}>&rdquo;</ToolButton>
        <span className="e-tools-gap" />
        <ToolButton label="字下げ（上の行のことにする）" disabled={!editing}
          onClick={() => editing && onLineChange?.(editing.withIndent(editing.indent + 1))}>→</ToolButton>
        <ToolButton label="字下げを戻す" disabled={!editing || editing.indent === 0}
          onClick={() => editing && onLineChange?.(editing.withIndent(editing.indent - 1))}>←</ToolButton>
      </nav>

      <div className="e-lines">
        {note.lines.map((line) => {
          const item = items.find((i) => i.lineId === line.id);
          const isEditing = line.id === editingId;
          return (
            <div
              key={line.id}
              className={`e-line ${isEditing ? "is-editing" : ""}`}
              style={{ paddingLeft: 6 + line.indent * 16 }}
              onDrop={(e) => {
                setDragOver(false);
                if (onDropRef?.(line.id, e)) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              {line.isTask && (
                <button
                  type="button"
                  className="e-check"
                  title={line.has("done") ? "済んだ" : "やること"}
                  onClick={() => onToggleMark?.(line.id, line.has("done") ? "todo" : "done")}
                >
                  {line.has("done") ? "☑" : "☐"}
                </button>
              )}

              {isEditing ? (
                <LineInput
                  line={line}
                  onCommit={(text) => onLineChange?.(line.withText(text))}
                  onLeave={() => setEditingId(null)}
                  onEnter={(text) => {
                    onLineChange?.(line.withText(text));
                    const next = onNewLineAfter?.(line.id);
                    if (next) setFocusNext(next);
                  }}
                  onBackspaceEmpty={() => {
                    const at = note.indexOf(line.id);
                    const prev = at > 0 ? note.lines[at - 1] : undefined;
                    onRemoveLine?.(line.id);
                    if (prev) setFocusNext(prev.id);
                  }}
                  onIndent={(by) => onLineChange?.(line.withIndent(line.indent + by))}
                />
              ) : (
                <span
                  className="e-text"
                  role="textbox"
                  tabIndex={0}
                  onClick={() => setEditingId(line.id)}
                  onFocus={() => setEditingId(line.id)}
                >
                  <RenderedLine line={line} nameOfRef={nameOfRef} renderRef={renderRef} />
                </span>
              )}

              {/* 拾ったもの。外れていたら見える ── 見えれば直せる */}
              {item && item.found.length > 0 && (
                <span className="e-found">
                  {item.found.slice(0, 4).map((f, i) => (
                    <span key={`${f}-${i}`} className="e-found-chip">{f}</span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </StyledNote>
  );
};

// ========== 1 行 ==========

/** 書いている行。**書いたまま**（指の目印も見える）を出す */
const LineInput: FC<{
  line: NoteLine_行;
  onCommit: (text: string) => void;
  onLeave: () => void;
  onEnter: (text: string) => void;
  onBackspaceEmpty: () => void;
  onIndent: (by: number) => void;
}> = ({ line, onCommit, onLeave, onEnter, onBackspaceEmpty, onIndent }) => {
  const [text, setText] = useState(line.text);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setText(line.text), [line.text]);
  useEffect(() => {
    ref.current?.focus();
    const at = ref.current?.value.length ?? 0;
    ref.current?.setSelectionRange(at, at);
  }, []);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter(text);
      return;
    }
    if (e.key === "Backspace" && text === "") {
      e.preventDefault();
      onBackspaceEmpty();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      onIndent(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === "Escape") {
      setText(line.text);
      onLeave();
    }
  };

  return (
    <input
      ref={ref}
      className={`e-input ${headingClass(line)}`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== line.text) onCommit(text);
        onLeave();
      }}
      onKeyDown={onKeyDown}
    />
  );
};

/** 書いていない行。**出来上がった姿**（装飾が効いて、指は札になる） */
const RenderedLine: FC<{
  line: NoteLine_行;
  nameOfRef?: (ref: ObjectRef) => string | undefined;
  renderRef?: (ref: ObjectRef) => ReactNode;
}> = ({ line, nameOfRef, renderRef }) => {
  // 空行にも高さが要る（押して書き始められるように）。中身は CSS が入れる
  if (line.isBlank) return <span className="e-blank" />;

  const parts: ReactNode[] = [];
  let at = 0;
  for (const m of line.text.matchAll(REF_PATTERN)) {
    const before = line.text.slice(at, m.index);
    if (before) parts.push(<span key={`t${at}`}>{before}</span>);
    const ref: ObjectRef = { type: m[1], id: m[2] };
    parts.push(
      <span key={`r${m.index}`} className="e-ref">
        {renderRef?.(ref) ?? nameOfRef?.(ref) ?? m[2]}
      </span>,
    );
    at = (m.index ?? 0) + m[0].length;
  }
  const tail = line.text.slice(at);
  if (tail) parts.push(<span key="tail">{tail}</span>);

  return <span className={`e-rendered ${markClasses(line)} ${headingClass(line)}`}>{parts}</span>;
};

const headingClass = (line: NoteLine_行): string =>
  line.heading > 0 ? `is-h${line.heading}` : "";

const markClasses = (line: NoteLine_行): string =>
  line.marks.map((m) => `is-${m}`).join(" ");

const ToolButton: FC<{
  label: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}> = ({ label, on, disabled, onClick, children }) => (
  <button type="button" className={`e-tool ${on ? "is-on" : ""}`} title={label} disabled={disabled} onClick={onClick}>
    {children}
  </button>
);

const StyledNote = styled.div<ComponentPropsWithoutRef<'div'>>`
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font: 13px/1.7 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;
  border-radius: 10px;

  &[data-drag-over='on'] { box-shadow: inset 0 0 0 2px #1f6fd0; background: rgba(31,111,208,0.05); }

  .e-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .e-title {
    flex: 1; min-width: 0;
    font: inherit; font-size: 14px; font-weight: bold; color: inherit;
    background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 2px 4px;
  }
  .e-title:hover { border-color: rgba(0,0,0,.18); }
  .e-title:focus { outline: none; border-color: #1f6fd0; background: #fff; }

  .e-tools { display: flex; align-items: center; gap: 3px; margin-bottom: 6px; flex-wrap: wrap; }
  .e-tools-gap { width: 8px; }
  .e-tool {
    min-width: 24px; height: 22px; padding: 0 5px;
    border: 1px solid rgba(0,0,0,.14); border-radius: 5px;
    background: #fff; color: #444; font-size: 11px; line-height: 1; cursor: pointer;
  }
  .e-tool:disabled { opacity: .35; cursor: default; }
  .e-tool.is-on { background: #1f6fd0; border-color: #1f6fd0; color: #fff; }

  .e-lines { flex: 1; min-height: 0; overflow: auto; }

  .e-line {
    display: flex; align-items: baseline; gap: 4px;
    min-height: 22px; padding: 1px 4px 1px 0; border-radius: 4px;
  }
  .e-line:hover { background: rgba(0,0,0,.03); }
  .e-line.is-editing { background: rgba(31,111,208,.06); }

  .e-check { border: none; background: none; cursor: pointer; padding: 0; color: #1f6fd0; font-size: 13px; }

  .e-text, .e-input { flex: 1; min-width: 0; }
  .e-text { cursor: text; }
  .e-input {
    font: inherit; color: inherit; background: transparent;
    border: none; outline: none; padding: 0;
  }

  /* 見出しは大きく。押した瞬間に姿が変わるので、効いたことが判る */
  .is-h1 { font-size: 15px; font-weight: bold; color: #0f2a52; }
  .is-h2 { font-size: 14px; font-weight: bold; color: #24425f; }
  .is-h3 { font-weight: bold; }

  .is-strong { font-weight: bold; }
  /* 取り消しと引用は**拾わない**ので、薄くして「読まれていない」ことを見せる */
  .is-strike { text-decoration: line-through; color: #9aa1ab; }
  .is-quote { color: #8a919b; border-left: 2px solid #ccd2da; padding-left: 6px; }
  .is-done { color: #9aa1ab; text-decoration: line-through; }

  .e-blank::before { content: "\00a0"; }

  /* 指（ほかのバブリのもの）。名前は持ち主のものなので、向こうで直せばここも変わる */
  .e-ref { display: inline-flex; vertical-align: baseline; }

  /* 拾ったもの。読みものの邪魔をしない濃さで、右端に寄せる */
  .e-found { display: flex; gap: 3px; flex-shrink: 0; align-items: center; }
  .e-found-chip {
    font-size: 10px; line-height: 1.5;
    padding: 0 5px; border-radius: 8px;
    background: rgba(31,111,208,.09); color: #3d6ea8; white-space: nowrap;
  }
`;
