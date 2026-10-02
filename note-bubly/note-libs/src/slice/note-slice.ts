/**
 * メモの**入れ物**（リポジトリ）。集約を保存して取り出すだけを持つ。
 * 行を足す・印を付ける・読み解くのは集約の仕事（CLAUDE.md 規則 6）。
 */
import { createSelector, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import { Note_メモ, type NotePlain } from "../domain/Note.domain.js";

export type NoteState = {
  noteList: NotePlain[];
};

const initialState: NoteState = { noteList: [] };

export const noteSlice = createSlice({
  name: "note",
  initialState,
  reducers: {
    setNoteList: (state, action: PayloadAction<NotePlain[]>) => {
      state.noteList = action.payload;
    },
    addNote: (state, action: PayloadAction<NotePlain>) => {
      state.noteList.push(action.payload);
    },
    /** 集約を丸ごと置く（保存だけ） */
    updateNote: (state, action: PayloadAction<NotePlain>) => {
      const i = state.noteList.findIndex((n) => n.id === action.payload.id);
      if (i !== -1) state.noteList[i] = action.payload;
    },
    removeNote: (state, action: PayloadAction<string>) => {
      state.noteList = state.noteList.filter((n) => n.id !== action.payload);
    },
  },
});

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof noteSlice> {}
}

injectSlice(noteSlice);

type StateWithNote = RootState & { note: NoteState };

export const { setNoteList, addNote, updateNote, removeNote } = noteSlice.actions;

const selectNoteListRaw = (state: StateWithNote): NotePlain[] => state.note?.noteList ?? [];

export const selectNotes = createSelector([selectNoteListRaw], (list): Note_メモ[] =>
  list.map(Note_メモ.fromPlain),
);

export const selectNoteById = (id: string) =>
  createSelector([selectNoteListRaw], (list): Note_メモ | undefined => {
    const plain = list.find((n) => n.id === id);
    return plain ? Note_メモ.fromPlain(plain) : undefined;
  });

export { Note_メモ };
export type { NotePlain };
