'use client';

/**
 * useWorldFile — 世界（世界線＋履歴）をローカルファイルとして開く・保存する。
 *
 * 画面に出す状態（ファイル名・未保存かどうか・進行中・メッセージ）と、
 * 4 つの操作（開く／保存／名前を付けて保存／白紙から始める）をまとめる。
 *
 * ファイルハンドルは React の state ではなく ref に置く。再レンダーの単位ではなく
 * 「このタブが今どのファイルを掴んでいるか」というセッションの事実であり、
 * 変わったときに再描画したいのはファイル名（＝スライス側）だけだから。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@bublys-org/state-management";
import {
  selectWorldFile,
  worldFileSynced,
  worldFileDetached,
  worldFileNoteChanged,
} from "../slice/worldFileSlice.js";
import {
  collectWorldFile,
  serializeWorldFile,
} from "../world-file/collectWorldFile.js";
import { applyWorldFile, clearDocumentScopes } from "../world-file/applyWorldFile.js";
import { buildSampleItems } from "../objects/seed.js";
import { commitBundle } from "../objects/commit.js";
import { APP_SCOPE_ID } from "../objects/repository.js";
import {
  validateWorldFile,
  suggestedFileName,
  WorldFileError,
} from "../world-file/worldFileFormat.js";
import {
  isFileSystemAccessSupported,
  pickFileToOpen,
  pickFileToSave,
  readTextFromHandle,
  writeTextToHandle,
  ensurePermission,
  rememberHandle,
  recallHandle,
  forgetHandle,
  downloadText,
  promptForTextFile,
  FilePickerCancelled,
  type FileHandleLike,
} from "../world-file/fileAccess.js";

export type WorldFileMessage = {
  kind: "info" | "warn" | "error";
  text: string;
};

export interface WorldFileController {
  /** 開いているファイル名（未紐づけなら null） */
  fileName: string | null;
  /** 最後に保存・読み込みした日時（ISO 8601） */
  syncedAt: string | null;
  /** 最後の保存以降に世界が変わったか */
  dirty: boolean;
  /** ファイルに書き込むメモ */
  note: string;
  /** File System Access API が使えるか（使えないとダウンロード方式になる） */
  supported: boolean;
  /** 「保存」が上書きになるか（＝ファイルを掴んでいるか） */
  canOverwrite: boolean;
  /** 処理中（ボタンを止める用） */
  busy: boolean;
  /** 直前の操作の結果メッセージ */
  message: WorldFileMessage | null;
  open: () => Promise<void>;
  save: () => Promise<void>;
  saveAs: () => Promise<void>;
  startBlank: () => void;
  loadSample: () => void;
  setNote: (note: string) => void;
  dismissMessage: () => void;
}

export function useWorldFile(): WorldFileController {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const doc = useAppSelector(selectWorldFile);

  const handleRef = useRef<FileHandleLike | null>(null);
  const [hasHandle, setHasHandle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<WorldFileMessage | null>(null);

  const supported = isFileSystemAccessSupported();

  // リロード後も同じファイルへ「保存」できるよう、覚えているハンドルを拾い直す。
  // 権限はここでは要求しない（ユーザー操作の外では拒否されるため）。実際に書くとき、
  // ボタンのハンドラの中で ensurePermission する。
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    recallHandle().then((handle) => {
      if (cancelled || !handle) return;
      handleRef.current = handle;
      setHasHandle(true);
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const run = useCallback(
    async (task: () => Promise<WorldFileMessage | null>) => {
      setBusy(true);
      try {
        setMessage(await task());
      } catch (error) {
        if (error instanceof FilePickerCancelled) {
          setMessage(null);
          return;
        }
        const text =
          error instanceof WorldFileError
            ? error.message
            : `失敗しました: ${error instanceof Error ? error.message : String(error)}`;
        setMessage({ kind: "error", text });
      } finally {
        setBusy(false);
      }
    },
    []
  );

  /** ファイル内容のテキストを作る（保存の共通部分） */
  const buildText = useCallback(async () => {
    const { file, unresolvedHashes, stats } = await collectWorldFile(store, doc.note);
    return { text: serializeWorldFile(file), unresolvedHashes, stats };
  }, [store, doc.note]);

  const writeTo = useCallback(
    async (handle: FileHandleLike) => {
      if (!(await ensurePermission(handle, "readwrite"))) {
        throw new WorldFileError("ファイルへの書き込みが許可されませんでした");
      }
      const { text, unresolvedHashes, stats } = await buildText();
      await writeTextToHandle(handle, text);
      handleRef.current = handle;
      setHasHandle(true);
      await rememberHandle(handle);
      dispatch(worldFileSynced({ fileName: handle.name }));
      return message0(handle.name, stats, unresolvedHashes);
    },
    [buildText, dispatch]
  );

  const saveAs = useCallback(
    () =>
      run(async () => {
        if (!supported) {
          // 非対応ブラウザではダウンロードするしかない。ファイルは掴めないので
          // 以後の「保存」も毎回ダウンロードになる。
          const { text, unresolvedHashes, stats } = await buildText();
          const name = suggestedFileName(doc.note);
          downloadText(name, text);
          dispatch(worldFileSynced({ fileName: name }));
          return message0(name, stats, unresolvedHashes);
        }
        const handle = await pickFileToSave(suggestedFileName(doc.note));
        return writeTo(handle);
      }),
    [run, supported, buildText, doc.note, dispatch, writeTo]
  );

  const save = useCallback(
    () =>
      run(async () => {
        const handle = handleRef.current;
        if (!supported || !handle) {
          // 掴んでいるファイルが無いので「名前を付けて保存」に倒す。
          // run の入れ子を避けるため、ここでは saveAs 本体を直接呼ばない。
          if (!supported) {
            const { text, unresolvedHashes, stats } = await buildText();
            const name = suggestedFileName(doc.note);
            downloadText(name, text);
            dispatch(worldFileSynced({ fileName: name }));
            return message0(name, stats, unresolvedHashes);
          }
          const picked = await pickFileToSave(suggestedFileName(doc.note));
          return writeTo(picked);
        }
        return writeTo(handle);
      }),
    [run, supported, buildText, doc.note, dispatch, writeTo]
  );

  const open = useCallback(
    () =>
      run(async () => {
        let text: string;
        let name: string;
        if (supported) {
          const handle = await pickFileToOpen();
          text = await readTextFromHandle(handle);
          name = handle.name;
          handleRef.current = handle;
          setHasHandle(true);
          await rememberHandle(handle);
        } else {
          const picked = await promptForTextFile();
          text = picked.text;
          name = picked.name;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new WorldFileError("JSON として読めませんでした");
        }
        const { file, warnings } = validateWorldFile(parsed);
        const result = await applyWorldFile(store, file);
        dispatch(worldFileSynced({ fileName: name, note: file.note ?? "" }));

        const summary = `${name} を読み込みました（世界線 ${result.loadedScopes} 件・状態 ${result.casCount} 件）`;
        if (warnings.length > 0) {
          return {
            kind: "warn" as const,
            text: `${summary}。${warnings.map((w) => w.message).join(" / ")}`,
          };
        }
        return { kind: "info" as const, text: summary };
      }),
    [run, supported, store, dispatch]
  );

  /** 掴んでいるファイルを手放す（白紙・例データ読み込みの共通部分） */
  const detach = useCallback(() => {
    handleRef.current = null;
    setHasHandle(false);
    void forgetHandle();
    dispatch(worldFileDetached());
  }, [dispatch]);

  /** 白紙から始める。保存対象のスコープを空グラフにし、ファイルとの紐づけを解く。 */
  const startBlank = useCallback(() => {
    clearDocumentScopes(store);
    detach();
    setMessage({ kind: "info", text: "白紙から始めました" });
  }, [store, detach]);

  /**
   * 例データ（デバッグ用のデータパターン）を読み込む。
   *
   * ファイルを開くのと同じ「全置き換え」にする。足し込みにすると、今の世界の状態しだいで
   * 出来上がりが変わってしまい、「このパターンを再現する」という用途に使えない。
   * 1 回の grow でまとめて入れる（同期ループで addObject すると、各 grow が同じ
   * stale なグラフから派生して互いを上書きしてしまう）。
   */
  const loadSample = useCallback(() => {
    const items = buildSampleItems();
    clearDocumentScopes(store);
    commitBundle(store, APP_SCOPE_ID, items);
    detach();
    setMessage({
      kind: "info",
      text: `例データを読み込みました（${items.length} 件）`,
    });
  }, [store, detach]);

  const setNote = useCallback(
    (note: string) => {
      dispatch(worldFileNoteChanged(note));
    },
    [dispatch]
  );

  return {
    fileName: doc.fileName,
    syncedAt: doc.syncedAt,
    dirty: doc.dirty,
    note: doc.note,
    supported,
    canOverwrite: supported && hasHandle,
    busy,
    message,
    open,
    save,
    saveAs,
    startBlank,
    loadSample,
    setNote,
    dismissMessage: () => setMessage(null),
  };
}

/** 保存後のメッセージ。履歴が欠けていたらそれも伝える */
function message0(
  fileName: string,
  stats: { scopeCount: number; nodeCount: number; casCount: number },
  unresolvedHashes: string[]
): WorldFileMessage {
  const base = `${fileName} に保存しました（世界線 ${stats.scopeCount} 件・履歴 ${stats.nodeCount} ノード・状態 ${stats.casCount} 件）`;
  if (unresolvedHashes.length > 0) {
    return {
      kind: "warn",
      text: `${base}。ただし状態データ ${unresolvedHashes.length} 件が見つからず、履歴の一部が欠けています`,
    };
  }
  return { kind: "info", text: base };
}
