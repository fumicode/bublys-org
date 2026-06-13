/**
 * Redux スライス
 *
 * ドメインオブジェクトの CRUD は per-domain スライスを手書きせず、
 * objects/repository.ts の汎用リポジトリ（useObjects / useObject / useObjectRepo）に一本化した。
 * 世界線CAS（worldLineGraph slice）は world-line/init.ts 経由で注入される。
 */
export {};
