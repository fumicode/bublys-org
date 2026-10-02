'use client';
/**
 * メモの見た目 ── **ただのメモとして書ける所**。
 *
 * > **いま居る行は、書いたまま。ほかの行は、出来上がった姿。**
 *
 * ★ 装飾は**ボタン 1 つ**で付く。見出し・チェック・太字・取り消し・引用・字下げ。
 *   種類を選ばせる欄は作らない ── それだと「書く」と「分ける」で 2 手になる。
 *   装飾は書き手が付けたものだから、メモの範囲内。
 * ★ **意味づけはここではやらない**。「時刻」「金額」「場所」などを拾って札にするのは
 *   「メモを解釈する」という別のバブリの仕事。書いた通りを出すだけにする
 *   （バブリの単機能原則）。
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
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import { Note_メモ } from "../domain/Note.domain.js";
import { NoteLine_行, type LineMark } from "../domain/NoteLine.domain.js";

/** 指の目印。描くときに札へ置き換える */
const REF_PATTERN = /@\{([A-Za-z][A-Za-z0-9-]*):([^}]+)\}/g;

export type NoteViewProps = {
  note: Note_メモ;
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
                  nameOfRef={nameOfRef}
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
            </div>
          );
        })}
      </div>
    </StyledNote>
  );
};

// ========== 1 行 ==========

/**
 * 書いている行。**書いていない時と同じ `<span>` のまま**、`contentEditable` で書ける
 * ようにする（要素が `<input>` に切り替わらない ── 位置ずれも青枠も出ない）。
 *
 * ★ 指は `<span contentEditable="false">` の**札**として置き、書いている最中も**札のまま**。
 *   キャレットは札の外だけを歩き、Backspace で札はまとめて 1 つとして消える。
 * ★ 中身はマウント時に 1 度だけ DOM へ書き、以降は React に触らせない
 *   （キーが変わるまで再マウントは起きない）。読むのは blur / Enter のときに DOM から。
 */
const LineInput: FC<{
  line: NoteLine_行;
  nameOfRef?: (ref: ObjectRef) => string | undefined;
  onCommit: (text: string) => void;
  onLeave: () => void;
  onEnter: (text: string) => void;
  onBackspaceEmpty: () => void;
  onIndent: (by: number) => void;
}> = ({ line, nameOfRef, onCommit, onLeave, onEnter, onBackspaceEmpty, onIndent }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const composingRef = useRef(false);
  const escapingRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ブラウザ側で書き出される focus 印を、インラインで潰す（CSS より強い優先度で）
    Object.assign(el.style, {
      outline: "none",
      border: "0",
      boxShadow: "none",
      background: "transparent",
      padding: "0",
      margin: "0",
    });
    el.replaceChildren(...textToNodes(line.text, nameOfRef));
    el.focus();
    placeCaretAtEnd(el);
    // 初回のマウント時のみ。以降 line.text が変わっても DOM へは書き戻さない
    // （書いている最中に外から上書きすると、キャレットが飛ぶ・打ち込みが消える）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readText = (): string => nodesToText(ref.current);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (composingRef.current) return; // IME 変換中は素通し
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter(readText());
      return;
    }
    if (e.key === "Backspace" && readText() === "") {
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
      escapingRef.current = true;
      // 元の中身に戻して離れる。blur で commit されないよう escapingRef を立てる
      const el = ref.current;
      if (el) el.replaceChildren(...textToNodes(line.text, nameOfRef));
      onLeave();
    }
  };

  const onBlur = () => {
    if (escapingRef.current) { escapingRef.current = false; return; }
    const now = readText();
    if (now !== line.text) onCommit(now);
    onLeave();
  };

  return (
    <span
      ref={ref}
      className={`e-input ${headingClass(line)}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; }}
    />
  );
};

// ---- 生の文字列 ↔ DOM ノードの並び ----

/**
 * 生の文字列を DOM のノードに変える。`@{Type:id}` は**指の札**（contentEditable=false）に。
 * 名前が引ければ名前を、引けなければ id を札に出す。
 */
const textToNodes = (
  text: string,
  nameOfRef?: (ref: ObjectRef) => string | undefined,
): Node[] => {
  const nodes: Node[] = [];
  let at = 0;
  for (const m of text.matchAll(REF_PATTERN)) {
    const before = text.slice(at, m.index);
    if (before) nodes.push(document.createTextNode(before));
    const type = m[1];
    const id = m[2];
    const span = document.createElement("span");
    span.className = "e-ref";
    span.setAttribute("contenteditable", "false");
    span.dataset.refType = type;
    span.dataset.refId = id;
    span.textContent = nameOfRef?.({ type, id }) ?? id;
    nodes.push(span);
    at = (m.index ?? 0) + m[0].length;
  }
  const tail = text.slice(at);
  if (tail) nodes.push(document.createTextNode(tail));
  return nodes;
};

/**
 * contentEditable の中身を、`@{Type:id}` を含む生の文字列に戻す。
 * 札は `dataset` から型と id を読み直して復元する ── 表示名は打ち直しの余地があるので使わない。
 */
const nodesToText = (root: HTMLElement | null): string => {
  if (!root) return "";
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const type = el.dataset.refType;
    const id = el.dataset.refId;
    if (type && id) { out += `@{${type}:${id}}`; return; }
    if (el.tagName === "BR") { out += "\n"; return; } // 念のため
    for (const child of Array.from(el.childNodes)) walk(child);
  };
  for (const child of Array.from(root.childNodes)) walk(child);
  return out;
};

const placeCaretAtEnd = (el: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
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
  padding: 18px 22px 14px;
  font: 14px/1.75 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif;
  color: #1f2328;
  border-radius: 10px;

  &[data-drag-over='on'] { box-shadow: inset 0 0 0 2px #1f6fd0; background: rgba(31,111,208,0.05); }

  /* 題 ── 見出しの体裁で置く。フォームには見せない ── クリックで書ける、以上の飾りは要らない */
  .e-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .e-title {
    flex: 1; min-width: 0;
    font: inherit; font-size: 22px; line-height: 1.35; font-weight: 700; color: inherit;
    background: transparent; border: 0; outline: 0; box-shadow: none;
    padding: 2px 0; margin: 0;
    -webkit-appearance: none; appearance: none;
    border-radius: 3px;
  }
  .e-title::placeholder { color: #b7bcc4; }
  .e-title:hover { background: rgba(0,0,0,.03); }
  .e-title:focus { background: transparent; }

  /* 道具 ── 枠のない字だけの並び。押せるときは濃く、押せないときは薄く */
  .e-tools {
    display: flex; align-items: center; gap: 2px;
    margin-bottom: 10px;
    color: #6a717c;
  }
  .e-tools-gap { width: 10px; }
  .e-tool {
    min-width: 24px; height: 24px; padding: 0 6px;
    border: 0; background: transparent; color: inherit;
    font: inherit; font-size: 12px; line-height: 1; cursor: pointer;
    border-radius: 4px;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .e-tool:hover:not(:disabled) { background: rgba(0,0,0,.06); color: #1f2328; }
  .e-tool:disabled { opacity: .35; cursor: default; }
  .e-tool.is-on { color: #1f6fd0; background: rgba(31,111,208,.10); }

  .e-lines { flex: 1; min-height: 0; overflow: auto; }

  /* 行 ── 通常時は完全に地の姿。書いている行だけ、ごく薄く印を付ける */
  .e-line {
    display: flex; align-items: baseline; gap: 6px;
    min-height: 26px; padding: 1px 2px 1px 0;
    border-radius: 3px;
  }
  .e-line.is-editing { background: rgba(31,111,208,.05); }

  .e-check {
    border: 0; background: none; cursor: pointer; padding: 0;
    color: #6a717c; font-size: 14px; line-height: 1;
    align-self: center;
  }
  .e-check:hover { color: #1f6fd0; }

  .e-text, .e-input { flex: 1; min-width: 0; }
  .e-text { cursor: text; }

  /* 書いている行の入力欄 ── **書いていない行と同じ字面**にする。枠も背景も出さない */
  .e-input,
  .e-input:focus,
  .e-input:focus-visible,
  .e-input:hover {
    font: inherit; color: inherit; background: transparent !important;
    border: 0 !important; outline: none !important; box-shadow: none !important;
    padding: 0 !important; margin: 0 !important;
    -webkit-appearance: none; appearance: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* 見出し ── 書いた瞬間に大きさが変わることで、装飾が効いたと分かる */
  .is-h1 { font-size: 20px; line-height: 1.4; font-weight: 700; color: #0f2a52; }
  .is-h2 { font-size: 17px; line-height: 1.4; font-weight: 700; color: #24425f; }
  .is-h3 { font-size: 15px; font-weight: 700; }

  .is-strong { font-weight: 700; }
  /* 取り消しと引用は**拾わない**ので、薄くして「読まれていない」ことを見せる */
  .is-strike { text-decoration: line-through; color: #9aa1ab; }
  .is-quote { color: #6a717c; border-left: 3px solid #d0d7de; padding-left: 10px; }
  .is-done { color: #9aa1ab; text-decoration: line-through; }

  .e-blank::before { content: "\00a0"; }

  /* 指（ほかのバブリのもの）。名前は持ち主のものなので、向こうで直せばここも変わる */
  .e-ref { display: inline-flex; vertical-align: baseline; }
`;
