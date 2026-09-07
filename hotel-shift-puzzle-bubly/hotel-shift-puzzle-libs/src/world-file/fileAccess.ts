/**
 * ローカルファイルの読み書き（File System Access API）。
 *
 * ダウンロード／アップロードではなく、普通のデスクトップアプリと同じ操作感にする:
 *   - 「開く」でファイルを選ぶと、そのファイルへの参照（ハンドル）を保持する
 *   - 「保存」は同じファイルに上書きする（ダイアログは出ない）
 *   - 「名前を付けて保存」で別ファイルにする
 *   - ハンドルは IndexedDB に残るので、リロードしても同じファイルを開き直せる
 *
 * File System Access API は Chromium 系だけなので、非対応ブラウザでは
 * 従来のダウンロード／`<input type="file">` に落とす（ボタンが死なないように）。
 * その場合は「同じファイルに上書き」はできないので、保存は常にダウンロードになる。
 *
 * 型定義: TypeScript の DOM lib にはまだ入っていないので、使う分だけここで宣言する。
 */

// ---------------------------------------------------------------------------
// 最小限の型宣言（lib.dom.d.ts に未収録のため）
// ---------------------------------------------------------------------------

type PermissionMode = "read" | "readwrite";

export interface FileHandleLike {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
  queryPermission?(opts: { mode: PermissionMode }): Promise<PermissionState>;
  requestPermission?(opts: { mode: PermissionMode }): Promise<PermissionState>;
  isSameEntry?(other: FileHandleLike): Promise<boolean>;
}

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type FileSystemWindow = Window & {
  showSaveFilePicker?: (opts?: {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }) => Promise<FileHandleLike>;
  showOpenFilePicker?: (opts?: {
    multiple?: boolean;
    types?: FilePickerAcceptType[];
  }) => Promise<FileHandleLike[]>;
};

const JSON_TYPES: FilePickerAcceptType[] = [
  {
    description: "勤務表ファイル (JSON)",
    accept: { "application/json": [".hsp.json", ".json"] },
  },
];

/** File System Access API が使えるか（Chromium 系＋セキュアコンテキストのみ） */
export function isFileSystemAccessSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as FileSystemWindow;
  return typeof w.showSaveFilePicker === "function" && typeof w.showOpenFilePicker === "function";
}

/** ユーザーがダイアログを閉じた（キャンセルした）だけのときに投げるエラー */
export class FilePickerCancelled extends Error {
  constructor() {
    super("キャンセルされました");
    this.name = "FilePickerCancelled";
  }
}

function asCancellation(error: unknown): never {
  // ピッカーのキャンセルは DOMException AbortError。失敗ではないので区別する。
  if (error instanceof DOMException && error.name === "AbortError") {
    throw new FilePickerCancelled();
  }
  throw error;
}

// ---------------------------------------------------------------------------
// 開く・保存する
// ---------------------------------------------------------------------------

/** 「開く」ダイアログを出してハンドルを得る */
export async function pickFileToOpen(): Promise<FileHandleLike> {
  const w = window as FileSystemWindow;
  if (!w.showOpenFilePicker) throw new Error("このブラウザは対応していません");
  try {
    const [handle] = await w.showOpenFilePicker({ multiple: false, types: JSON_TYPES });
    return handle;
  } catch (error) {
    asCancellation(error);
  }
}

/** 「名前を付けて保存」ダイアログを出してハンドルを得る */
export async function pickFileToSave(suggestedName: string): Promise<FileHandleLike> {
  const w = window as FileSystemWindow;
  if (!w.showSaveFilePicker) throw new Error("このブラウザは対応していません");
  try {
    return await w.showSaveFilePicker({ suggestedName, types: JSON_TYPES });
  } catch (error) {
    asCancellation(error);
  }
}

/** ハンドルからテキストを読む */
export async function readTextFromHandle(handle: FileHandleLike): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

/** ハンドルへテキストを書く（上書き） */
export async function writeTextToHandle(
  handle: FileHandleLike,
  text: string
): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
}

/**
 * 保存に必要な権限があるか確かめ、無ければ要求する。
 *
 * リロード後に復元したハンドルは権限が切れていることがあり、その場合
 * ユーザー操作の中で `requestPermission` を呼べば再取得できる（＝ボタンのハンドラ内で呼ぶ）。
 */
export async function ensurePermission(
  handle: FileHandleLike,
  mode: PermissionMode
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  if ((await handle.queryPermission({ mode })) === "granted") return true;
  return (await handle.requestPermission({ mode })) === "granted";
}

// ---------------------------------------------------------------------------
// ハンドルの記憶（リロードしても同じファイルを開き直す）
// ---------------------------------------------------------------------------

const HANDLE_DB = "hotel-shift-puzzle-file";
const HANDLE_STORE = "handles";
const HANDLE_KEY = "current";

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 1);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB を開けません"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
    };
  });
}

/**
 * 今開いているファイルのハンドルを覚える（ハンドルは構造化複製できるのでそのまま入る）。
 *
 * これは「次に開いたときも同じファイルに保存できる」ための便宜であって、保存そのものでは
 * ない。プライベートウィンドウなどで IndexedDB が使えなくても保存は成功させたいので、
 * ここで失敗しても投げずに握りつぶす（そのセッション中は ref のハンドルで動く）。
 */
export async function rememberHandle(handle: FileHandleLike): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, "readwrite");
      tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("ハンドルを保存できません"));
    });
    db.close();
  } catch {
    // 覚えられなくても保存は成立している
  }
}

/** 前回開いていたファイルのハンドルを思い出す（無ければ undefined） */
export async function recallHandle(): Promise<FileHandleLike | undefined> {
  try {
    const db = await openHandleDb();
    const handle = await new Promise<FileHandleLike | undefined>((resolve) => {
      const tx = db.transaction(HANDLE_STORE, "readonly");
      const request = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result as FileHandleLike | undefined);
      request.onerror = () => resolve(undefined);
    });
    db.close();
    return handle;
  } catch {
    return undefined;
  }
}

/** 覚えているハンドルを忘れる（新規作成＝どのファイルにも紐づかない状態にする） */
export async function forgetHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(HANDLE_STORE, "readwrite");
      tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // 忘れられなくても実害はない
  }
}

// ---------------------------------------------------------------------------
// 非対応ブラウザ向けのフォールバック
// ---------------------------------------------------------------------------

/** ダウンロードとして保存する（File System Access API 非対応時） */
export function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** `<input type="file">` で開く（File System Access API 非対応時） */
export function promptForTextFile(): Promise<{ name: string; text: string }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new FilePickerCancelled());
        return;
      }
      file.text().then((text) => resolve({ name: file.name, text }), reject);
    };
    input.click();
  });
}
