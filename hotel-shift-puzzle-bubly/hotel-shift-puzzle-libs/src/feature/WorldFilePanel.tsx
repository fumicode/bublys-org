'use client';

import { FC } from "react";
import type { StoreFormat } from "@bublys-org/hotel-shift-puzzle-model";
import { WorldFileView } from "../ui/WorldFileView.js";
import { useWorldFile } from "./useWorldFile.js";

/**
 * 勤務表ファイルの操作バブル。
 *
 * feature 層の役目は `useWorldFile`（Redux ＋ ファイル I/O）と
 * `WorldFileView`（表示のみ）をつなぐことだけ。
 */
export const WorldFilePanel: FC<{
  /** このデプロイで選べる形態（例データを出すかが決まる） */
  formats: readonly StoreFormat[];
}> = ({ formats }) => {
  const file = useWorldFile(formats);

  return (
    <WorldFileView
      fileName={file.fileName}
      syncedAt={file.syncedAt}
      dirty={file.dirty}
      note={file.note}
      supported={file.supported}
      canOverwrite={file.canOverwrite}
      busy={file.busy}
      message={file.message}
      onOpen={() => void file.open()}
      onSave={() => void file.save()}
      onSaveAs={() => void file.saveAs()}
      onStartBlank={file.startBlank}
      onLoadSample={file.loadSample}
      onNoteChange={file.setNote}
      onDismissMessage={file.dismissMessage}
    />
  );
};
