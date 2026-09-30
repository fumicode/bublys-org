'use client';
/**
 * メモ 1 件 ── 入れ物と、指の持ち主を、見た目に繋ぐ所。
 *
 * ★ **指の名前は持ち主に訊く**（`resolveObjectPlain`）。地図で地点の名前を直せば、
 *   メモの中の札もその場で変わる ── 名前を写して持たないから。
 * ★ 読み解きは毎回ここで出す（`readNote`）。溜め込むと、書き換えたのに古い読みが残る。
 */
import { FC, DragEvent as ReactDragEvent, useCallback, useMemo } from "react";
import { shallowEqual } from "react-redux";
import {
  ObjectView,
  anyObjectDragType,
  extractIdFromUrl,
  getObjectType,
  parseDragPayload,
  resolveObjectPlain,
  type ObjectRef,
} from "@bublys-org/bubbles-ui";
import { getSchema, readRoleText } from "@bublys-org/domain-registry/schema";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { NoteView } from "../ui/NoteView.js";
import { Note_メモ } from "../domain/Note.domain.js";
import type { LineMark, NoteLine_行 } from "../domain/NoteLine.domain.js";
import { readNote } from "../domain/read/readNote.js";
import { selectNoteById, updateNote } from "../slice/note-slice.js";

const refKey = (ref: ObjectRef): string => `${ref.type}/${ref.id}`;

export const NoteDetail: FC<{ noteId: string }> = ({ noteId }) => {
  const dispatch = useAppDispatch();
  const note = useAppSelector(selectNoteById(noteId));

  const save = useCallback((next: Note_メモ) => dispatch(updateNote(next.toPlain())), [dispatch]);

  /** メモの中の指ぜんぶ */
  const refs = useMemo(
    () => (note ? note.lines.flatMap((l) => l.refs) : []),
    [note],
  );

  /**
   * 指の名前。**表にして返す**（関数を返さない）── セクタが毎回新しい関数を返すと、
   * 中身が同じでも「変わった」と見なされて描き直しが止まらない。
   */
  const names = useAppSelector((state) => {
    const out: Record<string, string> = {};
    for (const ref of refs) {
      const key = refKey(ref);
      if (out[key] !== undefined) continue;
      const name = readRoleText(getSchema(ref.type), resolveObjectPlain(ref.type, ref.id, state), "title");
      if (name) out[key] = name;
    }
    return out;
  }, shallowEqual);

  const items = useMemo(() => (note ? readNote(note) : []), [note]);

  const canAccept = useCallback((e: ReactDragEvent) => anyObjectDragType(e) !== undefined, []);

  /** 落ちてきたものを、その行の末尾に指として挿す */
  const onDropRef = useCallback(
    (lineId: string | null, e: ReactDragEvent): boolean => {
      if (!note) return false;
      const dragType = anyObjectDragType(e);
      if (!dragType) return false;
      const payload = parseDragPayload(e, { acceptTypes: [dragType] });
      if (!payload?.url) return false;
      const type = getObjectType(payload.type);
      const id = extractIdFromUrl(payload.url);
      if (!type || !id) return false;
      const line = lineId ? note.line(lineId) : note.lines[note.lines.length - 1];
      if (!line) return false;
      save(note.withLine(line.withRefInserted({ type, id })));
      return true;
    },
    [note, save],
  );

  if (!note) {
    return <div style={{ padding: 12, color: "#666" }}>このメモは見つかりませんでした。</div>;
  }

  return (
    <NoteView
      note={note}
      items={items}
      /**
       * **このメモを掴む所。**
       *
       * ★ 無かったころ、開いているメモからは渡せなかった（掴めるのは一覧の札だけ）
       *   ── 一覧を開いてから掴む、の 2 手が要った。
       * ★ 「旅程へ」とは書かない。**渡す先を決めるのは掴んだ人**で、
       *   地図にも落とせるし、ポケットにも入る。ここは「掴める」とだけ言う。
       */
      head={
        <ObjectView type="Note" id={note.id} url={`notes/${note.id}`} label={note.title} draggable>
          <span
            title="掴んで、旅程や地図に落とす"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px", borderRadius: 12,
              background: "#fff6d6", border: "1px solid #e3d9b0",
              fontSize: 11, color: "#6b5d2f", cursor: "grab", whiteSpace: "nowrap",
            }}
          >
            ✥ このメモを掴む（{items.filter((i) => i.kind !== "note").length}件）
          </span>
        </ObjectView>
      }
      nameOfRef={(ref) => names[refKey(ref)]}
      /** 札は掴める ── メモから地図へ、地図からメモへ、同じものが行き来する */
      renderRef={(ref) => (
        <ObjectView type={ref.type} id={ref.id} label={names[refKey(ref)]} openingPosition="bubble-side-right">
          <span className="e-ref-chip">{names[refKey(ref)] ?? ref.id}</span>
        </ObjectView>
      )}
      onTitleChange={(title) => save(note.withTitle(title))}
      onLineChange={(line: NoteLine_行) => save(note.withLine(line))}
      onToggleMark={(lineId: string, mark: LineMark) => save(note.toggleMark(lineId, mark))}
      onNewLineAfter={(lineId) => {
        const id = `${noteId}-${crypto.randomUUID().slice(0, 8)}`;
        save(note.withNewLineAfter(lineId, id));
        return id;
      }}
      onRemoveLine={(lineId) => save(note.withoutLine(lineId))}
      onDropRef={onDropRef}
      canAccept={canAccept}
    />
  );
};
