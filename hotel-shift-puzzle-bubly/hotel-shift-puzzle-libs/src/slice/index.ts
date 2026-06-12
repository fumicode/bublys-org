/**
 * Redux スライス
 *
 * 各スライスは `slice.injectInto(rootReducer)` を副作用で実行して
 * bublys-os の store に自動注入される。
 */
export * from "./staff-slice.js";
export * from "./workshift-slice.js";
export * from "./schedule-slice.js";
