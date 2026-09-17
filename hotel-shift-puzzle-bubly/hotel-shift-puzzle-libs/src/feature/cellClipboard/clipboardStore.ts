/**
 * clipboardStore — アプリ内のセルの置き場（#166）
 *
 * 最後にコピー／カットしたセルの**中身**を1つだけ持つ（オブジェクトとして貼るとき・カットの点線に使う）。
 * 見えている文字は OS のクリップボードに置くので、ここには「そのとき書いた文字」だけを覚える
 * （値のみで貼るとき、クリップボードの文字がこのカットのものかを見分ける）。
 *
 * Redux にも世界線にも載せない。ドメインの状態ではない（世界線に載せるのはドメインの状態だけ）し、
 * リロードで消えてよい。同じ勤務表を開いている全バブルでカットの点線を出すため、購読できる形にする。
 */
import { useSyncExternalStore } from "react";
import type { CopiedCell } from "@bublys-org/hotel-shift-puzzle-model";

export type CellClipboardContent = {
  /** コピー元の勤務表 */
  scheduleId: string;
  /** コピーしたセルの中身 */
  cells: CopiedCell[];
  /** カットか（貼ったときに元を未定にする） */
  cut: boolean;
  /** そのとき OS のクリップボードに書いた文字（飛び地を含む選択なら undefined） */
  text?: string;
};

let content: CellClipboardContent | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const cellClipboardStore = {
  get: (): CellClipboardContent | null => content,
  set: (next: CellClipboardContent | null): void => {
    content = next;
    emit();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** 置き場の中身を購読する */
export function useCellClipboardContent(): CellClipboardContent | null {
  return useSyncExternalStore(cellClipboardStore.subscribe, cellClipboardStore.get, cellClipboardStore.get);
}
