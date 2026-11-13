/**
 * シフトントンのデスクトップ版（Electron）の入口。
 *
 * やっていることは「Web 版の画面（`hotel-shift-puzzle-app` の `dist/`）を、
 * ネットにつながない窓で開く」だけ。画面のコードには手を入れない。
 *
 * ルール:
 *   1. 画面は `app://shiftonton/` で配る（`file://` だと `<base href="/">` と、
 *      バブルの並びを URL のパスに書く仕組みが壊れる）。
 *   2. データの置き場所は表示名と切り離して固定する（`lib/identity.ts`）。
 *   3. アプリの外へは一切つながない（`lib/networkPolicy.ts`）。
 *   4. 同時に開けるのは 1 つだけ。2 つ開くと同じデータのフォルダを取り合う。
 */
import { app, BrowserWindow, Menu, protocol, session } from "electron";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentTypeOf } from "./lib/contentType.js";
import { APP_HOST, APP_ORIGIN, APP_SCHEME, DATA_DIR_NAME } from "./lib/identity.js";
import { isAllowedRequest } from "./lib/networkPolicy.js";
import { resolveAppFile } from "./lib/resolveAppFile.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * 配る画面のフォルダ。
 * インストールした版では EXE に同梱したもの、開発中は Web 版のビルド結果をそのまま読む。
 */
const rendererDir = app.isPackaged
  ? path.join(process.resourcesPath, "renderer")
  : path.resolve(here, "../../hotel-shift-puzzle-app/dist");

// ★ データの置き場所を固定する。`ready` より前に決める必要がある。
app.setPath("userData", path.join(app.getPath("appData"), DATA_DIR_NAME));

// ★ `app://` を「普通の Web サイトと同じ扱い」にする。
//   standard … `/` 始まりの相対 URL・オリジン・localStorage が普通に効く
//   secure   … File System Access API などが使える（安全な接続とみなす）
//   Worker・fetch・モジュールスクリプトも通す
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const isSingle = app.requestSingleInstanceLock();
if (!isSingle) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function serveApp(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    if (new URL(request.url).host !== APP_HOST) {
      return new Response("Not Found", { status: 404 });
    }
    // ★ `net.fetch(file://...)` は使わない。それも「外への通信」のルール（`file:` は止める）に
    //   かかるので、画面のファイルは Node から直接読んで返す。
    const file = resolveAppFile(request.url, rendererDir, isFile);
    try {
      const body = await readFile(file);
      return new Response(body, { headers: { "Content-Type": contentTypeOf(file) } });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  });
}

function closeToOutside(): void {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = isAllowedRequest(details.url);
    if (!allowed) {
      console.warn(`[shiftonton] 外への通信を止めました: ${details.url}`);
    }
    callback({ cancel: !allowed });
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: "シフトントン",
    // 読み込み前の一瞬を、画面の最初の色（index.html の背景）に合わせる
    backgroundColor: "#402818",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 綴りの辞書はネットから取りに行くので切る（ルール 3）
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  // 自分の画面の外へは移らない。リンクで新しい窓も開かない
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // 開発中だけ F12 で開発者ツール
  if (!app.isPackaged) {
    win.webContents.on("before-input-event", (_event, input) => {
      if (input.type === "keyDown" && input.key === "F12") {
        win.webContents.toggleDevTools();
      }
    });
  }

  void win.loadURL(`${APP_ORIGIN}/`);
  return win;
}

if (isSingle) {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on("window-all-closed", () => app.quit());

  void app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    session.defaultSession.setSpellCheckerEnabled(false);
    serveApp();
    closeToOutside();
    mainWindow = createWindow();
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  });
}
