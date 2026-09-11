/**
 * 勤務表ファイル — 世界（世界線グラフ＋履歴の全状態）をローカルファイルに保存・復元する。
 *
 * 層としては objects/ と同じ「世界線への読み書き」の仲間で、React にも UI にも依存しない
 * （fileAccess.ts だけがブラウザ API を触る）。
 */
export * from "./worldFileFormat.js";
export * from "./documentScopes.js";
export * from "./collectWorldFile.js";
export * from "./applyWorldFile.js";
export * from "./fileAccess.js";
