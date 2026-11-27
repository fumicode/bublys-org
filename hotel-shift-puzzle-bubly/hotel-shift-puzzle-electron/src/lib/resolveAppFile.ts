import path from "node:path";

/**
 * `app://shiftonton/...` のリクエストを、配る画面（Vite の `dist/`）の中のファイルに対応させる。
 *
 * ★ **ルールは Vercel の rewrites と同じ: 「あればそのファイル、無ければ index.html」。**
 *   バブルの並びは URL のパス（`/universe-...`）に書かれるので、そのパスでリロードしても
 *   画面が出るように、知らないパスはすべて入口の index.html に落とす。
 *
 * ★ **画面のフォルダの外は見せない。** `..` で外に出ようとするパスも index.html に落とす。
 *
 * @param requestUrl リクエストの URL（`app://shiftonton/assets/x.js` など）
 * @param rendererDir 画面のフォルダ（絶対パス）
 * @param isFile そのパスが普通のファイルとして在るか（テストから差し替えられるように受け取る）
 * @returns 返すファイルの絶対パス
 */
export function resolveAppFile(
  requestUrl: string,
  rendererDir: string,
  isFile: (absolutePath: string) => boolean,
): string {
  const root = path.resolve(rendererDir);
  const indexHtml = path.join(root, "index.html");

  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch {
    return indexHtml;
  }

  const candidate = path.resolve(root, `.${path.posix.normalize(`/${pathname}`)}`);
  const relative = path.relative(root, candidate);
  const isInside = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);

  return isInside && isFile(candidate) ? candidate : indexHtml;
}
