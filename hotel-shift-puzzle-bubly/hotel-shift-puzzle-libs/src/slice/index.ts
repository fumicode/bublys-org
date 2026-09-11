/**
 * Redux スライス
 *
 * ドメインオブジェクトの CRUD は per-domain スライスを手書きせず、
 * objects/repository.ts の汎用リポジトリ（useObjects / useObject / useObjectRepo）に一本化した。
 * 世界線CAS（worldLineGraph slice）は world-line/init.ts 経由で注入される。
 *
 * ここに残るのは「集約ではないアプリの状態」だけ。今は書類セッション
 * （どのファイルを開いているか）の1つ。
 */
export * from "./worldFileSlice.js";
