/**
 * 「今どのファイルを開いているか」を持つスライス。
 *
 * これは集約のリポジトリではなく、書類セッション（デスクトップアプリでいう
 * 「タイトルバーに出ているファイル名と、保存済みかどうか」）を表す。ドメインオブジェクトでは
 * ないのでリポジトリ規約の対象外だが、次の 2 つの理由で Redux に置く:
 *   - 画面（タイトル・保存ボタンの活性）が購読する必要がある
 *   - リロードをまたいで残ってほしい（redux-persist に載せる）
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { setGraph } from "@bublys-org/world-line-graph";
import { isDocumentScope } from "../world-file/documentScopes.js";

export interface WorldFileSliceState {
  /** 開いているファイル名。null なら「まだどのファイルにも紐づいていない」 */
  fileName: string | null;
  /** 最後に開いた／保存した日時（ISO 8601） */
  syncedAt: string | null;
  /** 最後の保存以降に世界が変わったか */
  dirty: boolean;
  /** ファイルに書き込むメモ（どんなデータパターンかの覚え書き） */
  note: string;
}

const initialState: WorldFileSliceState = {
  fileName: null,
  syncedAt: null,
  dirty: false,
  note: "",
};

export const worldFileSlice = createSlice({
  name: "hotelWorldFile",
  initialState,
  reducers: {
    /** ファイルを開いた／保存した（＝ファイルと世界が一致した） */
    worldFileSynced(
      state,
      action: PayloadAction<{ fileName: string | null; note?: string }>
    ) {
      state.fileName = action.payload.fileName;
      if (action.payload.note !== undefined) state.note = action.payload.note;
      state.syncedAt = new Date().toISOString();
      state.dirty = false;
    },

    /** どのファイルにも紐づかない新しい内容にした（白紙・例データ読み込み） */
    worldFileDetached(state) {
      state.fileName = null;
      state.syncedAt = null;
      state.dirty = false;
    },

    /** メモだけ更新する */
    worldFileNoteChanged(state, action: PayloadAction<string>) {
      state.note = action.payload;
      state.dirty = true;
    },

    /** 初期状態に戻す */
    worldFileReset() {
      return initialState;
    },
  },

  extraReducers: (builder) => {
    // 世界（＝保存対象のスコープ）が動いたら未保存にする。
    // 個々の操作に手を入れず「グラフが伸びたら dirty」という 1 つのルールで済ませる。
    builder.addMatcher(setGraph.match, (state, action) => {
      if (isDocumentScope(action.payload.scopeId)) state.dirty = true;
    });
  },
});

export const {
  worldFileSynced,
  worldFileDetached,
  worldFileNoteChanged,
  worldFileReset,
} = worldFileSlice.actions;

export function selectWorldFile(state: {
  hotelWorldFile?: WorldFileSliceState;
}): WorldFileSliceState {
  return state.hotelWorldFile ?? initialState;
}

declare module "@bublys-org/state-management" {
  interface LazyLoadedSlices {
    hotelWorldFile: WorldFileSliceState;
  }
}
