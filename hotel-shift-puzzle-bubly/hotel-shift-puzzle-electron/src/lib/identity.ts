/**
 * ★ **一度配ったら変えない値。**
 *
 * localStorage と IndexedDB は「オリジン（`app://shiftonton`）」ごと、
 * そのうえで「データのフォルダ（userData）」ごとに分かれる。
 * どれか 1 つでも変えると、前の版で作った勤務表が**消えたように見える**
 * （消えてはいないが、新しい版からは見えない）。
 *
 * 表示名（`productName`、「シフトントン」）はここに入れない ── 画面に出す名前は
 * 後から変えたくなるので、データの置き場所とは切り離しておく。
 */

/** 画面を配る独自スキーム。`file://` だと `<base href="/">` と URL の扱いが壊れる */
export const APP_SCHEME = "app";

/** オリジンのホスト部分。`app://shiftonton/` */
export const APP_HOST = "shiftonton";

/** 画面の入口 */
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

/** データのフォルダ名（`%APPDATA%\shiftonton`）。英字で固定する */
export const DATA_DIR_NAME = "shiftonton";
